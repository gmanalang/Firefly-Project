import "./App.css";
import React, { useState, useRef, useEffect } from "react";
import { eventWrapper } from "@testing-library/user-event/dist/utils";
import {
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  deleteObject,
  getStorage
} from "firebase/storage";
import { v4 } from "uuid";
import axios from "axios";
import { storage } from "./firebase/firebase.js";

function App() {
  const [currentSession, setCurrentSession] = useState(-1);
  const [imageUpload, setImageHolder] = useState(null);
  const [imageList, setImageList] = useState([]);
  const imageListRef = ref(storage, `sessions/${currentSession}`);
  const sessionListRef = ref(storage, "sessions/");
  const [imageRef, setImageRef] = useState("");
  const [imageUrls, setImageUrls] = useState([]);

  /**
   *
   * @returns {boolean} true if password is correct, false otherwise
   */
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

  /**
   *
   * @param {*} url
   */
  const downloadImageHandler = (url, name) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.onload = (event) => {
      const blob = xhr.response;
      const a = document.createElement("a");
      const urlObject = window.URL.createObjectURL(blob);
      a.href = urlObject;
      a.download = name; // the file name
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObject);
      document.body.removeChild(a);
    };
    xhr.open("GET", url);
    xhr.send();
  };

  /**
   *  Gets the list of images from the database and sets the imageList state
   *
   */
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

  /** */
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
  const passwordHandler = async (pin) => {
    let check = await checkPasswordRepo(pin);

    if (check) {
      setCurrentSession(pin);
      console.log("Password Accepted");
      return true;
    } else {
      console.log("Password Failed");
      return false;
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
    setImageUrls((prev) => [...prev, url]);
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

  ////////////////////////////
  // APP SWITCHER
  ////////////////////////////
  const [activeIndex, setActiveIndex] = useState(0);

  // Use the useEffect hook to apply the CSS classes based on the condition
  useEffect(() => {
    if (activeIndex === 0) {
      document.body.className = "panel-landing";
    } else {
      document.body.className = "bodyClass2";
    }

    // Cleanup function to remove the classes when the component is unmounted
    return () => {
      document.body.className = "";
    };
  }, [activeIndex]);

  ////////////////////////////
  // END APP SWITCHER
  ////////////////////////////

  return (
    <>
      <Panel isActive={activeIndex === 0}>
        <div>
          <Landing
            onAction={() => setActiveIndex(1)}
            generateSessionHandler={generateSessionHandler}
            passwordHandler={passwordHandler}
          />
        </div>
      </Panel>

      <Panel isActive={activeIndex === 1}>
        <div className="panel1">
          <UploadDownload
            currentSession={currentSession}
            setImageHolder={setImageHolder}
            uploadImageHandler={uploadImageHandler}
            deleteImageHandler={deleteImageHandler}
            setImageList={setImageList}
            setImageUrls={setImageUrls}
            imageListRef={imageListRef}
            fetchUrls={fetchUrls}
            imageList={imageList}
          />
        </div>
      </Panel>
    </>
  );
}

function Panel({ children, isActive }) {
  return (
    <section className="panel">{isActive ? <p>{children}</p> : null}</section>
  );
}

export function Landing({ onAction, generateSessionHandler, passwordHandler }) {
  const [AuthPin, setAuthPin] = useState("");

  const handleAuth = (v) => {
    if (v.length <= 5) {
      setAuthPin(v);
    }
  };

  const [, setUpload] = useState(false);
  const [, setCodesubmit] = useState(false);

  function generateCode() {
    setUpload(true);
    onAction();
    generateSessionHandler();
  }

  function handleSubmitCode() {
    if (passwordHandler(AuthPin)) {
      setCodesubmit(true);
      onAction();
    }
  }

  return (
    <div class="center">
      <h1 className="font-link">Firefly</h1>
      <br></br>
      <div className="button-23">
        <div>
          {
            <button className="button-24" onClick={generateCode}>
              Generate Code
            </button>
          }
        </div>

        <br></br>
        <br></br>
        <p>input pin:</p>
        <input
          value={AuthPin}
          onChange={(e) => handleAuth(e.target.value)}
          className="space"
          type="number"
          id="pin"
          pattern="\d*"
          inputMode="numeric"
        />
        <br></br>
        <br></br>
        <button
          onClick={handleSubmitCode}
          className={`button-25${AuthPin.length !== 5 ? " disabled" : ""}`}
          disabled={AuthPin.length !== 5}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

export function UploadDownload({
  currentSession,
  setImageHolder,
  uploadImageHandler,
  deleteImageHandler,
  setImageList,
  setImageUrls,
  imageListRef,
  fetchUrls,
  imageList,
}) {
  const [file, setFile] = useState();

  function handleSubmit(event) {
    event.preventDefault();
    const url = "http://localhost:3000/uploadFile";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    const config = {
      headers: {
        "content-type": "multipart/form-data",
      },
    };
    axios.post(url, formData, config).then((response) => {
      console.log(response.data);
    });
  }

  function triggerFileInputClick() {
    document.getElementById("hiddenFileInput").click();
  }

  return (
    <div>
      <Table
        setImageList={setImageList}
        setImageUrls={setImageUrls}
        imageListRef={imageListRef}
        fetchUrls={fetchUrls}
        currentSession={currentSession}
        imageList={imageList}
      />
      <div className="sidebar">
        <h1 className="font-link-2">Firefly</h1>
        <div className="showcode">
          <p>code:</p>
          <h1>{currentSession}</h1>
        </div>
        <br></br>
        <br></br>
        <br></br>

        {
          <form className="buttons-list">
            <input
              type="file"
              id="hiddenFileInput"
              style={{ display: "none" }}
              onChange={(event) => setImageHolder(event.target.files[0])}
            />
            <button
              type="button"
              onClick={triggerFileInputClick}
              className="button-25"
            >
              Upload File
            </button>
            <button
              type="button"
              className="button-25"
              onClick={uploadImageHandler}
            >
              Send Files
            </button>
            <br></br>
            <br></br>
            <button
              type="button"
              className="button-26"
              onClick={deleteImageHandler}
            >
              Delete All
            </button>
          </form>
        }
        <br></br>
        <div className="showcode-2">
          <p>time left</p>
          <Timer />
        </div>
      </div>
    </div>
  );
}


export function Table({
  setImageList,
  setImageUrls,
  imageListRef,
  fetchUrls,
  currentSession,
  imageList,
}) {
  // eslint-disable-next-line
  const [files, setFiles] = useState([
    { id: 1, name: "file1.txt" },
    { id: 2, name: "file2.pdf" },
    { id: 3, name: "file3.jpg" },
    { id: 4, name: "file3.jpg" },
  ]);

  const downloadFile = (file) => {
    // Add your file download logic here.
    // For instance, you can use fetch() to download the file from your server
    // and then create a Blob with the response data, followed by creating
    // an anchor element with the 'download' attribute and trigger a click event.
    alert(`Downloading ${file.name}`);
  };

  async function fileList() {
    const listOThings = await imageList.map((imageList) => (getObjectInfo(imageList)));
    console.log(listOThings);
  }

  


  // function getObjectName(object) {
  //   if (object && object._location && object._location.path_) {
  //       const path = object._location.path_;
  //       const name = path.split('/').pop();
  //       return name;
  //   }
  //   return null;
  // }

  async function getObjectInfo(object) {
    const storage = getStorage(object._service.app);
    const path = object._location.path_;
    const id = path.split('/')[1];
    const name = path.split('/').pop();
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);

    return {
        id,
        name,
        url
    };
  }
  

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
      <table>
        <thead>
          <tr>
            <th>File Name</th>
            <th>Download</th>
            <th>Delete</th>
          </tr>
        </thead>

        <tbody>
          {files.map((file) => (
            <tr key={file.id}>
              <td>{file.name}</td>
              <td>
                <button
                  className="button-25"
                  onClick={() => downloadFile(file)}
                >
                  Download
                </button>
              </td>
              <td>
                <button
                  className="button-25"
                  onClick={() => downloadFile(file)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          <button onClick = {fileList}>Click</button>
        </tbody>
      </table>
    </div>
  );
}

export function Timer() {
  // We need ref in this, because we are dealing
  // with JS setInterval to keep track of it and
  // stop it when needed
  // im just testing my git here so ignore this line
  const Ref = useRef(null);

  // The state for our timer
  const [timer, setTimer] = useState("00:00:00");

  const getTimeRemaining = (e) => {
    const total = Date.parse(e) - Date.parse(new Date());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / 1000 / 60 / 60) % 24);
    return {
      total,
      hours,
      minutes,
      seconds,
    };
  };

  const startTimer = (e) => {
    let { total, hours, minutes, seconds } = getTimeRemaining(e);
    if (total >= 0) {
      // update the timer
      // check if less than 10 then we need to
      // add '0' at the beginning of the variable
      setTimer(
        (hours > 9 ? hours : "0" + hours) +
          ":" +
          (minutes > 9 ? minutes : "0" + minutes) +
          ":" +
          (seconds > 9 ? seconds : "0" + seconds)
      );
    }
  };

  const clearTimer = (e) => {
    // If you adjust it you should also need to
    // adjust the Endtime formula we are about
    // to code next
    // ADJUST TO CHANGE THE AMOUNT OF TIME
    setTimer("00:15:00");

    // If you try to remove this line the
    // updating of timer Variable will be
    // after 1000ms or 1sec
    if (Ref.current) clearInterval(Ref.current);
    const id = setInterval(() => {
      startTimer(e);
    }, 1000);
    Ref.current = id;
  };

  const getDeadTime = () => {
    let deadline = new Date();

    // ADJUST THE NUMBER OF SECONDS IN THE TIMER HERE (currently 900)
    deadline.setSeconds(deadline.getSeconds() + 900);
    return deadline;
  };

  // We can use useEffect so that when the component
  // mount the timer will start as soon as possible

  // We put empty array to act as componentDid
  // mount only
  useEffect(() => {
    clearTimer(getDeadTime());

    // eslint-disable-next-line
  }, []);

  // Another way to call the clearTimer() to start
  // the countdown is via action event from the
  // button first we create function to be called
  // by the button

  return (
    <div>
      <h1>{timer}</h1>
    </div>
  );
}

export default App;
