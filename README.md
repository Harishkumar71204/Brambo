BRAMBO
BRAMBO is a web-based TV series discovery and tracking application. It helps users discover television shows, maintain a watchlist, track episode progress, manage favourites, and share reviews.

Show information, posters, ratings, and release details are retrieved from The Movie Database (TMDB) API.
Features
- TV series discovery – browse popular shows, new releases, top-rated titles, Netflix titles, HBO originals, and more.
- Search and filtering – find series by title and filter editor-curated results by genre, country, and collection.
- Watch progress – mark episodes as watched and continue from the next episode.
- Watch later – save shows to a personal list for future viewing.
- User accounts – create an account and log in using a username or email.
- Profiles – customise a profile with a bio, profile picture, and banner.
- Statistics – view watched episodes, completed seasons, shows watched, and estimated watch time.
- Favourites and reviews – save favourite shows, write reviews, and browse community reviews.
- Responsive interface – access the application on desktop and mobile-sized screens.
Technology Stack
Area	Technologies
Frontend	HTML, CSS, JavaScript
Backend	Node.js, Express
Database	MongoDB with Mongoose
Authentication	JSON Web Tokens (JWT), bcryptjs
External data	TMDB API
Other backend packages	CORS, dotenv

Requirements
Install the following before running the project:
- Node.js 18 or later
- npm
- MongoDB (local installation or MongoDB Atlas account)
- A TMDB API key or API read access token
- A code editor and a local frontend server (for example, VS Code Live Server)
Setup and Installation
1. Get the project files
Extract the project ZIP file and open the Brambo-main folder in your editor.
2. Configure the TMDB API
1. Create an account at The Movie Database.
2. Request an API key from the TMDB developer settings.
3. Open config.js in the project root.
4. Add your key:
window.BRAMBO_CONFIG = {
  apiKey: "YOUR_TMDB_API_KEY",
  apiType: "v3",
  apiBase: "http://localhost:5000"
};
For a TMDB API Read Access Token, set apiType to "read-token" and place the token in apiKey.

Important: Do not commit a real TMDB key or read access token to a public repository. For a public deployment, move TMDB requests behind a backend service and keep credentials in environment variables.
3. Configure the backend
Open a terminal in the server directory:
cd server
npm install
Create a .env file in the server directory using .env.example as a template:
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/brambo
JWT_SECRET=replace-this-with-a-long-random-secret
TOKEN_TTL=7d
If you use MongoDB Atlas, replace MONGO_URI with your Atlas connection string.

Generate a strong JWT secret instead of using the example value. Keep .env private and do not commit it to Git.
4. Start the backend
Make sure MongoDB is running, then run this from the server directory:
npm start
The API should be available at:
http://localhost:5000
To run the server in development mode with Node's watch mode:
npm run dev
5. Start the frontend
Open the project root (Brambo-main) using a local development server, such as Live Server in Visual Studio Code.

Launch:
http://127.0.0.1:<your-live-server-port>/index.html
Keep the backend running while using account registration and login. Confirm that apiBase in config.js points to the backend URL.
Backend API
The Express server currently provides these endpoints:
Method	Endpoint	Description
GET	/api/health	Checks whether the API is running
POST	/api/signup	Registers a new user
POST	/api/login	Authenticates with username/email and password
GET	/api/me	Returns the authenticated user's account details


For /api/me, include the JWT in the request header:
Authorization: Bearer YOUR_JWT
Data Storage Notes
- Account credentials and account records are stored in MongoDB. Passwords are hashed using bcryptjs.
- The frontend stores the session token and user activity data in the browser's localStorage.
- Watch progress, favourites, reviews, and profile customisations are currently maintained locally in the browser. They are not synchronised to MongoDB across different browsers or devices.
- The dashboard's Friends' recents section currently uses sample friend activity rather than live activity from other registered users.
Troubleshooting
Series are not loading
- Check that a TMDB key is configured correctly in config.js.
- Verify that the key or read access token is valid.
- Check the browser developer console for API errors.
Login or registration is not working
- Confirm that MongoDB is running and the backend started successfully.
- Check that apiBase in config.js matches the backend address.
- Check the terminal for MongoDB connection or server errors.
CORS error
- During development, the backend allows localhost and private LAN origins.
- For deployment, set CLIENT_ORIGIN in the backend .env file to the exact frontend origin or comma-separated allowed origins.
Session or activity is missing
- The frontend stores user activity in browser localStorage. Clearing site data or using another browser/device can remove or make that activity unavailable.
Credits
- TV series metadata and images: The Movie Database (TMDB).
- Fonts: DM Sans and Outfit via Google Fonts.
This project uses the TMDB API but is not endorsed or certified by TMDB.
