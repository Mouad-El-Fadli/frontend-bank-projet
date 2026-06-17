import api from './api';

const authService = {
  login: async (credentials) => {
    // Assuming the backend expects { username, password } and returns { access, role }
    const response = await api.post('/accounts/api/login/', credentials);
    return response.data;
  },
  
  // Example for fetching current user profile if needed
  getProfile: async () => {
    const response = await api.get('/accounts/api/profile/');
    return response.data;
  }
};

export default authService;
