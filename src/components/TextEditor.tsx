import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useParams } from "react-router-dom";
import { cerebellum } from "../socket";
import { Delta } from "quill/core";
import { v4 as uuidV4 } from "uuid";
import { usePresence } from "@cerebellum/sdk";
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
  const { presenceData, updatePresenceInfo } = usePresence(
    cerebellum,
    "cursor",
    { x: "333", y: "324" }
  );

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
      // console.log("text-change", delta);
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

  const handlePointerMove = (event: any) => {
    const cursor = {
      x: event.clientX,
      y: event.clientY,
    };

    updatePresenceInfo(cursor);
  };

  return (
    <div className="page-center-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      <div className="page-center">
        <div
          className="container"
          ref={editorRef}
          onPointerMove={handlePointerMove}
        ></div>
        {/* {console.log(presenceData)} */}
        {presenceData.map(({ socketId, x, y }) => {
          // console.log(socketId === cerebellum.getSocket().id);
          if (socketId === cerebellum.getSocket().id) return;
          // console.log(socketId);
          return (
            <div
              key={socketId}
              className="cursor"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                position: "absolute",
                width: "10px",
                height: "10px",
                backgroundColor: "red",
                borderRadius: "50%",
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/*
[
  { socketId: string, x: string, y: string},
  { socketId: string, x: string, y: string},
]
  Implementing live cursors
  - Client visits site
  - They are registered to presence of other cursors

  - I don't want a full re-render every time someone's cursor changes

  The cursor is tied to an event that fires `onPointerMove`
*/
