import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useParams } from "react-router-dom";
import { Delta } from "quill/core";
import { useCerebellum } from "@cerebellum/sdk";
import { Message } from "@cerebellum/sdk/dist/types";
import QuillCursors from "quill-cursors";

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

export default function TextEditor() {
  const cerebellum = useCerebellum();
  const { id: documentId } = useParams();
  const quillRef = useRef<Quill | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentLoaded, setDocumentLoaded] = useState(false);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      Quill.register("modules/cursors", QuillCursors);

      const quill = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: TOOLBAR_OPTIONS,
          cursors: {
            template: '<div class="custom-cursor">...</div>',
            hideDelayMs: 5000,
            hideSpeedMs: 0,
            selectionChangeSource: null,
            transformOnTextChange: true,
          },
        },
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
  }, [documentId, cerebellum]);

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
  }, [quillRef, documentId, documentLoaded, cerebellum]);

  useEffect(() => {
    if (quillRef.current == null) return;
    const handleTextChange = (
      delta: Delta,
      oldDelta: Delta,
      source: string
    ) => {
      if (source !== "user") return;
      cerebellum.publish(`text-change:${documentId}`, {
        delta,
      });
    };

    quillRef.current.on("text-change", handleTextChange);

    const handleRemoteChanges = (message: Message) => {
      console.log(message, cerebellum.socketId);
      if (cerebellum.socketId === message.socketId) return;
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
  }, [documentId, cerebellum]);

  return (
    <div className="page-center-wrapper">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      <div className="page-center">
        <div className="container" ref={editorRef}></div>
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
