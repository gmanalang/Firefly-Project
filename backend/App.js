import { eventWrapper } from "@testing-library/user-event/dist/utils";
import {
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";
import { useEffect, useState } from "react";
import { v4 } from "uuid";
import "./App.css";
import { storage } from "./firebase";

function App() {
  const [currentSession, setCurrentSession] = useState(-1);
  const [imageUpload, setImageHolder] = useState(null);
  const [imageList, setImageList] = useState([]);
  const imageListRef = ref(storage, `sessions/${currentSession}`);
  const sessionListRef = ref(storage, "sessions/");
  const [imageRef, setImageRef] = useState("");
  const [imageUrls, setImageUrls] = useState([]);

  const uploadImageHandler = () => {
    if (imageUpload == null) {
      return;
    }

    let currentImageRef = ref(
      storage,
      `sessions/${currentSession}/${imageUpload.name}`
    );

    setImageRef(currentImageRef);

    uploadBytes(currentImageRef, imageUpload).then((snapshot) => {
      setImageList((prev) => [...prev, snapshot.ref]);

      // getDownloadURL(snapshot.ref).then((url) => {
      //   setImageList((prev) => [...prev, url]);
      // });
    });
  };

  const downloadImageHandler = (url) => {

    


    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.onload = (event) => {
      const blob = xhr.response;
      const a = document.createElement("a");
      const urlObject = window.URL.createObjectURL(blob);
      a.href = urlObject;
      a.download = "image.jpg"; // the file name
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObject);
      document.body.removeChild(a);
    };
    xhr.open("GET", url);
    xhr.send();
  };

  const deleteImageHandler = () => {
    listAll(imageListRef)
      .then((response) => {
        response.items.forEach((item) => {
          deleteObject(item)
            .then(() => {
              console.log("Files deleted successfully");
            })
            .catch((error) => {
              console.log("Error deleting file:", error);
            });
        });
      })
      .catch((error) => {
        console.log("Error listing files:", error);
      });
    setImageList([]);
  };

  const deleteSingleHandler = (url) => {
    listAll(imageListRef)
      .then((response) => {
        response.items.forEach((item) => {
          getDownloadURL(item).then((itemUrl) => {
            if (itemUrl === url) {
              deleteObject(item)
                .then(() => {
                  setImageList((prev) => [
                    ...prev.filter((i) => i !== itemUrl),
                  ]);
                  console.log("File deleted successfully");
                })
                .catch((error) => {
                  console.log("Error deleting file:", error);
                });
            }
          });
        });
      })
      .catch((error) => {
        console.log("Error listing files:", error);
      });
  };

  /*
   * Checks the password against the files in database
   *
   */
  const passwordHandler = async (event) => {
    event.preventDefault();
    let check = await checkPasswordRepo(event.target[0].value);

    if (check) {
      setCurrentSession(event.target[0].value);
      console.log("Password Accepted");
    } else {
      console.log("Password Failed");
    }
  };

  const checkPasswordRepo = async (password) => {
    let out = false;

    let responses = await listAll(sessionListRef)
      .then((response) => response)
      .catch((error) => {
        console.log("No current session:", error);
        return false;
      });

    responses.prefixes.forEach((prefix) => {
      if (prefix._location.path.split("/")[1] === password) {
        out = true;
      }
    });
    return out;
  };

  const generateSessionHandler = async () => {
    let randSession = Math.floor(Math.random() * 90000 + 10000);
    let check = await checkPasswordRepo(randSession);

    while (check) {
      randSession = Math.floor(Math.random() * 90000 + 10000);
      check = await checkPasswordRepo(randSession);
    }

    setCurrentSession(randSession);
    console.log(randSession);
  };

  const fetchUrls = async (item) => {
    const url = await getDownloadURL(item);
    setImageUrls(prev => [...prev, url]);
  };

  useEffect(() => {
    setImageList([]);
    setImageUrls([]);
    listAll(imageListRef).then((response) => {
      response.items.forEach((item) => {
        setImageList((prev) => [...prev, item]);
        fetchUrls(item);
      });
    });
  }, [currentSession]);

  return (
    <div className="App">
      <form onSubmit={passwordHandler}>
        <input type="number" />
        <button>Password Checker</button>
      </form>
      <input
        type="file"
        onChange={(event) => setImageHolder(event.target.files[0])}
      />
      {currentSession === -1 ? (
        <div>Click Generate Session</div>
      ) : (
        <div>
          <div>Your Current Session is {currentSession}</div>
          <button onClick={uploadImageHandler}>Upload Image</button>
          <button onClick={deleteImageHandler}>Delete All</button>
        </div>
      )}

      <button onClick={generateSessionHandler}>Generate Session</button>

      {imageUrls.map((url, ind) => {
        return (
          <div>
            <img key={ind} src={url} />
            <div>{url}</div>
            <button onClick={() => deleteSingleHandler(url)}>Delete</button>
            <button onClick={() => downloadImageHandler(url)}>Download</button>
          </div>
        );
      })}
    </div>
  );
}

export default App;
