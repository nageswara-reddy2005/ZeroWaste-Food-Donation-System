const API_BASE_URL = 'http://localhost:5000/api';

class FoodPostService {
  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem('token');
  }

  // Get auth headers
  getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get all food posts with filters
  async getFoodPosts(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/food-posts?${queryParams}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get food posts error:', error);
      throw error;
    }
  }

  // Get single food post by ID
  async getFoodPost(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/food-posts/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get food post error:', error);
      throw error;
    }
  }

  // Create new food post
  async createFoodPost(foodPostData) {
    try {
      const response = await fetch(`${API_BASE_URL}/food-posts`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(foodPostData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create food post error:', error);
      throw error;
    }
  }

  // Update food post status
  async updateFoodPostStatus(id, status, notes = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/food-posts/${id}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status, notes })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update food post status error:', error);
      throw error;
    }
  }

  // Get user's food posts
  async getUserFoodPosts(type = 'all') {
    try {
      const response = await fetch(`${API_BASE_URL}/food-posts/user/my-posts?type=${type}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get user food posts error:', error);
      throw error;
    }
  }

  // Delete food post
  async deleteFoodPost(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/food-posts/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Delete food post error:', error);
      throw error;
    }
  }

  // Get nearby food posts using geolocation
  async getNearbyFoodPosts(latitude, longitude, radius = 10) {
    try {
      const filters = {
        lat: latitude,
        lng: longitude,
        radius: radius,
        status: 'Pending'
      };

      return await this.getFoodPosts(filters);
    } catch (error) {
      console.error('Get nearby food posts error:', error);
      throw error;
    }
  }

  // Get user's current location
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

const foodPostService = new FoodPostService();
export default foodPostService;
