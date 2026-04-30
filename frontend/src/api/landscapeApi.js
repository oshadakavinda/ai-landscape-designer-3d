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

export const modifyLandscapeDesign = async (currentLayout, userPrompt, inputData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/modify`, {
            current_layout: currentLayout,
            user_prompt: userPrompt,
            input_data: inputData,
        });
        return response.data;
    } catch (error) {
        console.error("Error modifying design:", error);
        throw error;
    }
};

