const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const bookingRouter = require('./routes/booking');
const feedbackRouter = require('./routes/feedback');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/bookings', bookingRouter);
app.use('/api/feedback', feedbackRouter);

app.get('/', (req, res) => {
  res.send('Eventique API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});