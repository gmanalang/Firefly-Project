import "./App.css";
import React, { useState, useRef, useEffect } from "react";
import {
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
  deleteObject,
  getStorage,
} from "firebase/storage";
import { storage } from "./firebase/firebase.js";

function App() {
  const [currentSession, setCurrentSession] = useState();
  const [imageUpload, setImageHolder] = useState(null);
  const [imageList, setImageList] = useState([]);
  const imageListRef = ref(storage, `sessions/${currentSession}`);
  const sessionListRef = ref(storage, "sessions/");
  const [files, setFiles] = useState([]);
  const [, setImageRef] = useState("");
  const [, setImageUrls] = useState([]);

  const [refresh, setRefresh] = useState(false);

  async function refreshFiles() {
    await setRefresh(!refresh);
  }

  // gets the important info to be able to
  // refer to later on in the code
  async function getObjectInfo(object) {
    const storage = getStorage(object._service.app);
    const path = object._location.path_;
    const id = Math.floor(Math.random() * 100);
    const name = path.split("/").pop();
    const storageRef = ref(storage, path);
    const url = await getDownloadURL(storageRef);

    return {
      id,
      name,
      url,
    };
  }


  /**
   *
   * @returns {boolean} true if password is correct, false otherwise
   */

  // called when hitting "Send File" button
  const uploadFileHandler = async () => {
    if (imageUpload == null) {
      return;
    }

    let currentImageRef = ref(
      storage,
      `sessions/${currentSession}/${imageUpload.name}`
    );

    setImageRef(currentImageRef);

    // snapshot is an Object which can invoke .ref
    // to get its key information about it
    const snapshot = await uploadBytes(currentImageRef, imageUpload);

    // Get the file information for the uploaded image
    const uploadedFileInfo = await getObjectInfo(snapshot.ref);

    // Update the files state with the uploaded file information
    // (allows for multiple files to be uploaded)
    setFiles((prev) => [...prev, uploadedFileInfo]);

    // refreshes the front-end to show the file
    await refreshFiles();
  };

  /**
   *
   * @param {*} url
   */

  // to be able to download the file on the front-end
  const downloadFileHandler = (url, name) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "blob";
    xhr.onload = (event) => {
      const blob = xhr.response;
      const a = document.createElement("a");
      const urlObject = window.URL.createObjectURL(blob);
      a.href = urlObject;
      a.download = name; // the file name - only thing changed from given Firebase code
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(urlObject);
      document.body.removeChild(a);
    };
    xhr.open("GET", url);
    xhr.send();
  };

  // delete all files
  const deleteAllFilesHandler = async () => {
    try {
      const response = await listAll(imageListRef);
      const deletePromises = response.items.map((item) => deleteObject(item));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error deleting images:", error);
    }

    // empty array again
    setFiles([]);

    // front-end should reflect this empty array
    await refreshFiles();
  };

  // delete a single file
  const deleteSingleHandler = async (url) => {
    try {
      const response = await listAll(imageListRef);
      const itemPromises = response.items.map(async (item) => {
        const itemUrl = await getDownloadURL(item);
        if (itemUrl === url) {
          try {
            await deleteObject(item);

            // as long as a file's url is not the itemUrl
            // (corresponding to the file that has to be
            // deleted), keep it in the array
            setImageList((prev) => [...prev.filter((i) => i !== itemUrl)]);
          } catch (error) {}
        }
      });

      // Wait for all itemPromises to complete before resolving
      // (if you don't have this, the file will appear on the
      // front-end despite it being deleted by the button)
      await Promise.all(itemPromises);
    } catch (error) {}
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
    // makes sure response (an object from Firebase) is valid
      .then((response) => response)
      .catch((error) => {
        return false;
      });

      // lists out all of the folder names (numbers),
      // and for each folder name, if it equals the
      // typed password, then out is mutated to true
    responses.prefixes.forEach((prefix) => {
      if (prefix._location.path.split("/")[1] === password) {
        out = true;
      }
    });
    
    // remains false if no such folder exists
    // (password is typed out wrong), and so
    // the website gives one an alert saying
    // this is an incorrect pin
    return out;
  };

  const generateSessionHandler = async () => {
    let randSession = Math.floor(Math.random() * 90000 + 10000);

    // using checkPasswordRepo not just for when
    // a password is manually typed, but also when
    // one is randomly generated
    let check = await checkPasswordRepo(randSession);

    // verifies that it's a new password each time
    // (while loop only runs if the randomly generated
    // password actually exists already)
    while (check) {
      randSession = Math.floor(Math.random() * 90000 + 10000);
      check = await checkPasswordRepo(randSession);
    }

    setCurrentSession(randSession);
  };


  ////////////////////////////
  // APP SWITCHER
  ////////////////////////////
  const [activeIndex, setActiveIndex] = useState(0);

  // Use the useEffect hook to apply the CSS classes based on the condition
  // (go from landing page to upload/download page)
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

  // giving Landing page and Upload/Download page
  // access to certain handlers it does not know
  // information about
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
            uploadImageHandler={uploadFileHandler}
            deleteImageHandler={deleteAllFilesHandler}
            setImageList={setImageList}
            setImageUrls={setImageUrls}
            imageListRef={imageListRef}
            imageList={imageList}
            downloadImageHandler={downloadFileHandler}
            deleteSingleHandler={deleteSingleHandler}
            refresh={refresh}
            refreshFiles={refreshFiles}
            setFiles={setFiles}
            getObjectInfo={getObjectInfo}
            files={files}
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

export function Landing({
  onAction,
  generateSessionHandler,
  passwordHandler,
  refreshFiles,
}) {
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

  // handles the landing page (when
  // hitting "submit" button)
  async function handleSubmitCode() {
    if (await passwordHandler(AuthPin)) {
      await refreshFiles();
      onAction();
    } else {
      alert("Incorrect Pin");
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
  imageList,
  downloadImageHandler,
  deleteSingleHandler,
  refresh,
  refreshFiles,
  getObjectInfo,
  setFiles,
  files,
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
        currentSession={currentSession}
        imageList={imageList}
        deleteSingleHandler={deleteSingleHandler}
        downloadImageHandler={downloadImageHandler}
        refresh={refresh}
        refreshFiles={refreshFiles}
        getObjectInfo={getObjectInfo}
        setFiles={setFiles}
        files={files}
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
            <button type="button" className="button-26" onClick={refreshFiles}>
              Refresh
            </button>
          </form>
        }
        <br></br>
        <div className="showcode-2">
          <p>time left</p>
          <Timer deleteImageHandler={deleteImageHandler} onAction={onAction} />
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
  refreshFiles,
  getObjectInfo,
  setFiles,
  files,
}) {
  const downloadFile = (url, name) => {
    downloadImageHandler(url, name);
  };

  // need to be async so that deleteFile
  // is only called upon clicking the 
  // corresponding button
  const deleteFile = async (url) => {
    await deleteSingleHandler(url);
    refreshFiles();
  };

  // fetch files from Firebase (also needs
  // to be async or else it won't load properly)
  const fetchFiles = async () => {
    try {
      const response = await listAll(imageListRef);
      const filePromises = response.items.map(async (item) => {
        const fileInfo = await getObjectInfo(item);
        return fileInfo;
      });

      const fetchedFiles = await Promise.all(filePromises);
      setFiles(fetchedFiles);
    } catch (error) {
      console.log("Error fetching files:", error);
    }
  };

  // whenever refreshing Firebase, we update
  // the new files (delete everything then bring
  // it back with the inclusion of the added
  // uploaded file)
  useEffect(() => {
    setFiles([]);
    fetchFiles();
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

export function Timer({ deleteImageHandler, onAction }) {
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
      // (onAction will switch back to the landing page since
      // the current ActionIndex is 0)
      deleteImageHandler();
      onAction();
      alert("Time's up!");

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
