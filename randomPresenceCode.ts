// useEffect(() => {
//   const handlePresenceLeave = (response: State) => {
//     setPresenceData((prevData) =>
//       prevData.filter((data) => data.socketId !== response.socketId)
//     );
//   };

//   const handlePresenceJoin = (response: State) => {
//     setPresenceData((prevData) => [...prevData, response]);
//   };

//   const handlePresenceUpdate = (response: State) => {
//     setPresenceData((prevData) =>
//       prevData.map((data) =>
//         data.socketId === response.socketId ? response : data
//       )
//     );
//   };

//   const reEnterPresenceSet = async () => {
//     const presenceUsers = await cerebellum.getPresenceSetMembers(
//       `cursor:${documentId}`
//     );
//     setPresenceData(presenceUsers);
//     await cerebellum.enterPresenceSet(`cursor:${documentId}`, {});
//   };
//   const presenceSetUsers = async () => {
//     const presenceUsers = await cerebellum.getPresenceSetMembers(
//       `cursor:${documentId}`
//     );
//     setPresenceData(presenceUsers);
//     cerebellum.subscribeToPresenceJoins(
//       `cursor:${documentId}`,
//       handlePresenceJoin
//     );
//     cerebellum.subscribeToPresenceUpdates(
//       `cursor:${documentId}`,
//       handlePresenceUpdate
//     );
//     cerebellum.subscribeToPresenceLeaves(
//       `cursor:${documentId}`,
//       handlePresenceLeave
//     );

//     cerebellum.on("reconnect", () => {
//       reEnterPresenceSet();
//     });
//   };
//   cerebellum.enterPresenceSet(`cursor:${documentId}`, {});
//   setTimeout(() => {
//     presenceSetUsers();
//   }, 2000);
// }, [documentId]);
