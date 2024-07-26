import Cerebellum from "@cerebellum/sdk";

const URL = "http://localhost:8001";

export const cerebellum = await Cerebellum(URL, {
  autoConnect: true,
  authRoute: {
    endpoint: "http://localhost:3000/login",
    method: "POST",
    payload: {},
  },
  reconnection: true, // Enable reconnection attempts
  reconnectionAttempts: 5, // Number of attempts before giving up
  reconnectionDelay: 5000, // Delay between reconnection
  reconnectionDelayMax: 5000, // Maximum delay between reconnection
  timeout: 20000, // Before a connection attempt is considered failed
  // API_KEY: "SAMPLE_API_KEY",
});
