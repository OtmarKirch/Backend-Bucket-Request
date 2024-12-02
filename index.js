const express = require('express');
const fileupload = require('express-fileupload');
const cors = require('cors');
const dotenv = require('dotenv');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = 8080;

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true
});

app.use(cors());
app.use(fileupload());

app.get('/', async (req, res) => {
    try {
        // Check connection to S3 bucket by listing objects
        const listObjectsParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            MaxKeys: 1 // Limit the number of objects returned to 1 for a quick check
        };
        await s3Client.send(new ListObjectsV2Command(listObjectsParams));
        res.send('You have reached the backend server and are connected to the S3 bucket.');
    } catch (error) {
        console.error('Error connecting to S3 bucket:', error.message);
        res.status(500).send('You reached the server, but no connecting to S3 bucket.');
    }
});

app.get('/files/list', (req, res) => {
    const listObjectsParams = {
        Bucket: process.env.S3_BUCKET_NAME
    };
    s3Client.send(new ListObjectsV2Command(listObjectsParams))
        .then((listObjectsResponse) => {
            res.send(listObjectsResponse);
        })
        .catch((error) => {
            console.log(error);
            res.status(500).send({ error: error.message });
        });
});

app.post('/files/upload', async (req, res) => {
    console.log(req.files)
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const file = req.files.file;
    const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.name,
        Body: file.data
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        res.send('File uploaded successfully.');
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/files/download', async (req, res) => {
    const { key } = req.query; // Get the object key from the query parameters

    if (!key) {
        return res.status(400).send('Missing key parameter');
    }

    const getObjectParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
    };

    try {
        const data = await s3Client.send(new GetObjectCommand(getObjectParams));
        res.setHeader('Content-Disposition', `attachment; filename=${key}`);
        data.Body.pipe(res); // Stream the object back to the client
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.get('/api/hello', (req, res) => {
    res.send('Hello World');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});