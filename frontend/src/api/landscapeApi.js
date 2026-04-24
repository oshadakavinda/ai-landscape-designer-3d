import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const generateLandscapeDesign = async (inputData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/generate`, inputData);
        return response.data;
    } catch (error) {
        console.error("Error generating design:", error);
        throw error;
    }
};
