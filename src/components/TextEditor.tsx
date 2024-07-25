import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useParams } from "react-router-dom";
import { cerebellum } from "../socket";
import { Delta } from "quill/core";
import { v4 as uuidV4 } from "uuid";
const SAVE_INTERVAL_MS = 2000;

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

type Message = {
  content: {
    delta: Delta;
    userId: string;
  };
};

export default function TextEditor() {
  const { id: documentId } = useParams();
  const quillRef = useRef<Quill | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [userId] = useState(uuidV4());
  //They have to give every user who sends a message a unique id
  // We give a client id to every user and put it on the message when they send it
  //Socket.io will give us a unique id for each client as a socketId

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      const quill = new Quill(editorRef.current, {
        theme: "snow",
        modules: { toolbar: TOOLBAR_OPTIONS },
      });
      quillRef.current = quill;
      quillRef.current.disable();
      return () => {};
    }
  }, []);

  useEffect(() => {
    if (documentId == null) return;

    const getDocument = async () => {
      try {
        const document = await cerebellum.getPastMessages(
          `Document:History:${documentId}`,
          {
            limit: 1,
            sortDirection: "descending",
          }
        );
        console.log(document);
        if (document.messages.length > 0) {
          const delta = JSON.parse(document.messages[0].content);
          quillRef.current?.setContents(delta);
          quillRef.current?.enable();
        } else {
          quillRef.current?.setText("");
        }
        quillRef.current?.enable();
        setLoading(false);
        setDocumentLoaded(true);
      } catch (error) {
        console.error("Error fetching document", error);
      }
    };
    setTimeout(() => {
      getDocument();
    }, 1000);
  }, [documentId]);

  useEffect(() => {
    if (quillRef.current == null && !documentLoaded) return;

    cerebellum.subscribeChannel(`Document:History:${documentId}`, () => {});

    const interval = setInterval(() => {
      const content = JSON.stringify(quillRef.current?.getContents());
      cerebellum.publish(`Document:History:${documentId}`, content);
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [quillRef, documentId, documentLoaded]);

  useEffect(() => {
    if (quillRef.current == null) return;
    const handleTextChange = (
      delta: Delta,
      oldDelta: Delta,
      source: string
    ) => {
      if (source !== "user") return;
      console.log("text-change", delta);
      cerebellum.publish(`text-change:${documentId}`, {
        userId,
        delta,
      });
    };

    quillRef.current.on("text-change", handleTextChange);

    const handleRemoteChanges = (message: Message) => {
      if (message.content.userId === userId) return;
      const delta = message.content.delta;
      quillRef.current?.updateContents(delta);
    };

    cerebellum.subscribeChannel(
      `text-change:${documentId}`,
      handleRemoteChanges
    );

    return () => {
      if (quillRef.current == null) return;
      quillRef.current.off("text-change", handleTextChange);
      cerebellum.unsubscribeChannel(
        `text-change:${documentId}`,
        handleRemoteChanges
      );
    };
  }, [documentId, userId]);

  return (
    <div className="page-center-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      <div className="page-center">
        <div className="container" ref={editorRef}></div>;
      </div>
    </div>
  );
}

/*

  input field (text)
    - only you can edit this input field

  I believe that socket.io will give us a unique id for each client
    - we can save this to the cerebellum class as a property
    - we include this on every message sent to the server

  Now
    {createdAt:
     contents:}

  Proposed
    {createdAT:
     contents:
     socketId: (or clientId)
  
  Currently when you send a message
    - the message is sent to the cerebellum server
    - the message is saved with queue to the database
    - the message is sent to all connected clients including the sender
    - the clients receive the message and update their local state

  The client does not receive the message that is send to the server by themselves
    - the client sends the message to the server
    - the client updates their local state
    - the message is saved with queue to the database
    - the message is sent to all connected clients excluding the sender
    - the clients receive the message and update their local state
  button (send)
*/
