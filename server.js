require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');


const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Mongoose Schema
const formSchema = new mongoose.Schema({
  role: { type: String, default: 'Student' },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: String,
  phone: { type: String, required: true },
  cetPercentile:  String,
  gradeLevel: String,
  caste: { 
    type: String, 
    required: true,
    enum: ['General', 'OBC', 'SC/ST', 'Others'] 
  },
  agreement: { 
    type: Boolean, 
    required: true,
    validate: (v) => v === true 
  },
  createdAt: { type: Date, default: Date.now }
});

const Form = mongoose.model('Form', formSchema);

// Google Sheets Integration
const updateGoogleSheet = async (formData) => {
  try {
    const response = await axios.post(process.env.GOOGLE_SCRIPT_URL, formData);
    console.log("Google Sheets response:", response.data);
    return response.data.includes("Success");
  } catch (error) {
    console.error("Google Sheets error:", error.message);
    return false;
  }
};

// Form Submission Endpoint
app.post('/api/form', async (req, res) => {
  try {
    // Validate required fields
    const required = ['firstName', 'lastName', 'phone',  'caste'];
    const missing = required.filter(field => !req.body[field]);
    if (missing.length) {
      return res.status(400).json({ 
        error: `Missing fields: ${missing.join(', ')}` 
      });
    }

    // Save to MongoDB
    const newForm = await Form.create(req.body);
    
    // Update Google Sheets (fire-and-forget)
    const sheetUpdated = await updateGoogleSheet(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Form submitted successfully',
      savedToMongoDB: true,
      savedToGoogleSheets: sheetUpdated,
      id: newForm._id
    });
    
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Server error' 
    });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Backend is up and running!');
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
