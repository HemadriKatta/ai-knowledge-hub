import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter: multer.Options["fileFilter"] = (
    req,
    file,
    callback
) => {
    if (file.mimetype !== "application/pdf") {
        callback(
            Object.assign(
                new Error("Only PDF files are allowed"),
                { statusCode: 400 }
            )
        );
        return;
    }

    callback(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});