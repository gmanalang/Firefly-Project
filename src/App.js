import "./App.css";
import React, { useState, useRef, useEffect } from "react";
import {
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  deleteObject,
  getStorage
} from "firebase/storage";
import { storage } from "./firebase/firebase.js";

function App() {
  const [currentSession, setCurrentSession] = useState();
  const [imageUpload, setImageHolder] = useState(null);
  const [imageList, setImageList] = useState([]);
  const imageListRef = ref(storage, `sessions/${currentSession}`);
  const sessionListRef = ref(storage, "sessions/");
  const [, setImageRef] = useState("");
  const [, setImageUrls] = useState([]);


  const [refresh, setRefresh] = useState(false);

  function refreshFiles() {
    setRefresh(!refresh);
  }

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

    refreshFiles();
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
            })
            .catch((error) => {
            });
        });
      })
      .catch((error) => {
      });
    setImageList([]);
    refreshFiles();
  };

  const deleteSingleHandler = async (url) => {
    try {
      const response = await listAll(imageListRef);
      
      const itemPromises = response.items.map(async (item) => {
        const itemUrl = await getDownloadURL(item);
  
        if (itemUrl === url) {
          try {
            await deleteObject(item);
            setImageList((prev) => [
              ...prev.filter((i) => i !== itemUrl),
            ]);
          } catch (error) {
          }
        }
      });
  
      // Wait for all itemPromises to complete before resolving
      await Promise.all(itemPromises);
  
    } catch (error) {
    }
  };
  

  /*
   * Checks the password against the files in database
   *
   */
  const passwordHandler = async (pin) => {
    let check = await checkPasswordRepo(pin);

    if (check) {
      setCurrentSession(pin);
      return true;
    } else {
      return false;
    }
  };

  const checkPasswordRepo = async (password) => {
    let out = false;

    let responses = await listAll(sessionListRef)
      .then((response) => response)
      .catch((error) => {
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
  };

  const fetchUrls = async (item) => {
    const url = await getDownloadURL(item);
    setImageUrls((prev) => [...prev, url]);
  };



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



  return (
    <>
      <Panel isActive={activeIndex === 0}>
        <div>
          <Landing
            onAction={() => setActiveIndex(1)}
            generateSessionHandler={generateSessionHandler}
            passwordHandler={passwordHandler}
            refreshFiles={refreshFiles}
          />
        </div>
      </Panel>

      <Panel isActive={activeIndex === 1}>
        <div className="panel1">
          <UploadDownload
            onAction={() => setActiveIndex(0)}
            currentSession={currentSession}
            setImageHolder={setImageHolder}
            uploadImageHandler={uploadImageHandler}
            deleteImageHandler={deleteImageHandler}
            setImageList={setImageList}
            setImageUrls={setImageUrls}
            imageListRef={imageListRef}
            fetchUrls={fetchUrls}
            imageList={imageList}
            downloadImageHandler={downloadImageHandler}
            deleteSingleHandler={deleteSingleHandler}
            refresh={refresh}
            refreshFiles={refreshFiles}
          />
        </div>
      </Panel>
    </>
  );

  ////////////////////////////
  // END APP SWITCHER
  ////////////////////////////
}

function Panel({ children, isActive }) {
  return (
    <section className="panel">{isActive ? <p>{children}</p> : null}</section>
  );
}

export function Landing({ onAction, generateSessionHandler, passwordHandler, refreshFiles }) {
  const [AuthPin, setAuthPin] = useState("");

  const handleAuth = (v) => {
    if (v.length <= 5) {
      setAuthPin(v);
    }
  };

  function generateCode() {
    onAction();
    generateSessionHandler();
  }

  async function handleSubmitCode() {
    if (await passwordHandler(AuthPin)) {
      refreshFiles();
      onAction();
    }
    else{
      alert("Incorrect Pin")
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
              New Session
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
  onAction,
  currentSession,
  setImageHolder,
  uploadImageHandler,
  deleteImageHandler,
  setImageList,
  setImageUrls,
  imageListRef,
  fetchUrls,
  imageList,
  downloadImageHandler,
  deleteSingleHandler,
  refresh,
  refreshFiles,
}) {

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
        deleteSingleHandler={deleteSingleHandler}
        downloadImageHandler={downloadImageHandler}
        refresh={refresh}
        refreshFiles={refreshFiles}
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
              Send File
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
            <br></br>
            <button
              type="button"
              className="button-26"
              onClick={refreshFiles}
            >
              Refresh
            </button>
          </form>
        }
        <br></br>
        <div className="showcode-2">
          <p>time left</p>
          <Timer 
            deleteImageHandler={deleteImageHandler}
            onAction={onAction}
          />
        </div>
      </div>
    </div>
  );
}


export function Table({
  setImageList,
  imageListRef,
  currentSession,
  deleteSingleHandler,
  downloadImageHandler,
  refresh,
  refreshFiles
}) {
  const [files, setFiles] = useState([]);

  const downloadFile = (url, name) => {
    downloadImageHandler(url, name);
  };

  const deleteFile = async (url) => {
    await deleteSingleHandler(url);
    refreshFiles();
  };


  // async function fileList() {
  //   let objectList = await imageList.map((item) => (getObjectInfo(item)));
  //   objectList = await Promise.all(objectList);
  //   objectList = objectList.slice(0, objectList.length/2);
  //   setFiles(objectList);
  // }

  async function fileList(item) {
    // let objectList = await Promise.all(imageList.map((item) => getObjectInfo(item)));
    let obj = await getObjectInfo(item);
    // objectList = objectList.slice(0, objectList.length / 2);
    setFiles(prev => [...prev, obj]);
}

  async function getObjectInfo(object) {
    const storage = getStorage(object._service.app);
    const path = object._location.path_;
    const id = Math.floor(Math.random() * 100);
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
  setFiles([]);
  listAll(imageListRef).then((response) => {
      response.items.forEach((item) => {
          setImageList((prev) => [...prev, item]);
          fileList(item);
      });
      // fileList();
  });
  // eslint-disable-next-line
}, [currentSession, refresh]);

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
                  onClick={() => downloadFile(file.url, file.name)}
                >
                  Download
                </button>
              </td>
              <td>
                <button
                  className="button-25"
                  onClick={() => deleteFile(file.url)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Timer({deleteImageHandler, onAction}) {
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
    } else {
      // When the timer reaches zero, call the deleteImageHandler
      deleteImageHandler();
      onAction();
      alert("Time's up!")
  
      // Clear the interval to stop the timer
      if (Ref.current) clearInterval(Ref.current);
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
