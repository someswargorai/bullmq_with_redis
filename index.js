const express = require("express");
const app = express();
const connectDB = require("./config/db_connection.js");
const User = require("./schema/userSchema.js");
const { default: mongoose } = require("mongoose");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const fs = require('fs/promises');
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const addEmailJob = require("./queue/producer.js");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 1024 * 1024 * 5,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("text/") || file.mimetype.startsWith("application/csv") || file.mimetype.startsWith("application/pdf")) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type"));
        }
    }
})


const llm = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: "AIzaSyAgikG8bxlOJpFR_xJhfviFtiQ-OecCWa0",
});


app.use(express.json());

((async () => {
    await connectDB();
})());


app.post("/file", upload.array("infoFile", 10), async (req, response) => {

    try {

        if (!req.files || req.files.length === 0) {
            return response.status(400).json({ error: "No file uploaded" });
        }

        const users = await User.find();
        console.log(req.files);

        for (const file of req.files) {
            if (file.mimetype.startsWith("text/") || file.mimetype.startsWith("application/csv")) {
                const content = file.buffer.toString();
                console.log(content);
            }
            else if (file.mimetype.startsWith("application/pdf")) {
                const parser = new PDFParse(new Uint8Array(file.buffer));
                const content = await parser.getText();
                console.log(content);
            }
        }

        // const messages = [
        //     new SystemMessage("You are a helpful assistant who replies in bullet points only."),
        //     new HumanMessage(`Here is the content of file ${content}. Tell me is it optimized or not?`),
        // ];
        // const res = await llm.stream(messages);

        // for await (let chunk of res) {
        //     console.log(chunk.content); 

        // }

        // await fs.unlink(req.file.path);
        response.status(200).json({ message: "File processed successfully" });
    } catch (err) {
        console.log(err);
        response.status(500).json({ error: err.message });
    }
})

app.get("/", async (req, res) => {

    try {
        const updated = await User.findByIdAndUpdate(
            "69e26e9ac34c5f0e5fb73750",
            { $set: { price: 1500000 } },
            { new: true }
        );

        console.log(updated);  // 1500000 ✅ new value
        res.status(200).json(updated);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }

})


app.post("/send-email", async (req, res) => {
  const { to, subject } = req.body;

  await addEmailJob({ to, subject });

  res.json({
    message: "Email job queued successfully",
  });
});




app.listen(3000, () => {
    console.log('app is listening on 3000')
})
