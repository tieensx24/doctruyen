const multer = require('multer');

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedTextTypes = ['text/plain', 'application/octet-stream'];

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  if (!allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error('Chỉ cho phép upload file ảnh JPG, PNG, WEBP hoặc GIF'));
  }

  cb(null, true);
};

const uploadImage = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 30,
  },
});

const textFileFilter = (req, file, cb) => {
  const isTxtName = /\.txt$/i.test(file.originalname || '');
  if (!isTxtName || !allowedTextTypes.includes(file.mimetype)) {
    return cb(new Error('Chỉ cho phép upload file .txt'));
  }

  cb(null, true);
};

const uploadTextFile = multer({
  storage,
  fileFilter: textFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ảnh không được vượt quá 5MB' });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Mỗi lần chỉ được upload tối đa 30 ảnh' });
    }

    return res.status(400).json({ message: err.message });
  }

  return res.status(400).json({ message: err.message || 'Upload ảnh thất bại' });
};

module.exports = {
  uploadImage,
  uploadTextFile,
  handleUploadError,
};
