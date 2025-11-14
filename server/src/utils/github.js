const axios = require("axios");

exports.getGitHubAccessToken = async (code) => {
    try {
        const response = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
            },
            {
                headers: {
                    Accept: "application/json"
                }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching access token:", error.message);
        throw new Error("Failed to get access token from GitHub");
    }
};

exports.getGitHubUser = async (accessToken) => {
    try {
        const response = await axios.get("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "ProjectPulse-App"
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error fetching GitHub user:", error.message);
        throw new Error("Failed to fetch GitHub user");
    }
};

exports.getGitHubRepos = async (accessToken) => {
    try {
        const response = await axios.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": "ProjectPulse-App"
            },
            params: {
                sort: "updated",
                per_page: 100
            }
        });

        return response.data;
    } catch (error) {
        console.error("Error fetching GitHub repos:", error.message);
        throw new Error("Failed to fetch GitHub repositories");
    }
};
