const coresOptions = {
    origin: [
        "http://localhost:5173",
         "http://localhost:4173",
        process.env.CLIENT_URL,
    ],
    credentials: true,

};

const   AALAP_TOKEN = "Aalap-token";

export { coresOptions, AALAP_TOKEN };