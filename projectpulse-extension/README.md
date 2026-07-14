# ProjectPulse VS Code Extension

A powerful VS Code extension for task management and GitHub integration, seamlessly connecting your development workflow with the ProjectPulse collaborative coding platform.

## Features

- **Task Management Sidebar**: View and manage your tasks directly in VS Code
- **GitHub OAuth Integration**: Secure authentication with your GitHub account
- **Real-time Task Operations**: Create, update, and track task progress
- **GitHub Issues Sync**: Synchronize tasks with GitHub issues
- **Categorized Task Views**: Organize tasks by status, priority, and source
- **Detailed Task Webviews**: Rich task editing interface with form controls
- **Activity Bar Integration**: Dedicated ProjectPulse sidebar for easy access

## Requirements

- VS Code 1.106.0 or higher
- ProjectPulse backend server running on `http://localhost:4000`
- GitHub account for authentication
- Node.js and npm for development

## Installation & Setup

### 1. Backend Setup
Ensure your ProjectPulse backend server is running:

```bash
cd server
npm install
npm start
```

The server should be accessible at `http://localhost:4000`.

### 2. Extension Installation

#### From Source (Development)
```bash
cd projectpulse-extension
npm install
npm run compile
```

Then press `F5` in VS Code to launch a new Extension Development Host window.

#### Package for Distribution
```bash
npm install -g vsce
vsce package
```

This creates a `.vsix` file that can be installed via:
```bash
code --install-extension projectpulse-0.0.1.vsix
```

### 3. GitHub OAuth Setup

The extension requires GitHub OAuth authentication. Make sure your ProjectPulse backend is configured with:

- `GITHUB_CLIENT_ID`: Your GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth app client secret
- `JWT_SECRET`: Secret for JWT token signing

## Usage

### Authentication

1. Open the ProjectPulse sidebar in VS Code (Activity Bar)
2. Click "Login with GitHub" in the Authentication section
3. Complete OAuth flow in your browser
4. Paste the access token when prompted

### Task Management

- **View Tasks**: Browse tasks in categorized views (My Tasks, GitHub Issues, To Do, In Progress, Done)
- **Create Task**: Click the "+" icon in the Tasks view or use Command Palette (`Ctrl+Shift+P` → "ProjectPulse: Create New Task")
- **Update Task**: Click on any task to open detailed view with editing capabilities
- **Refresh**: Click refresh icon to sync latest tasks
- **GitHub Sync**: Click sync icon to synchronize with GitHub issues

### Available Commands

- `ProjectPulse: Login with GitHub` - Authenticate with GitHub
- `ProjectPulse: Logout` - Sign out from ProjectPulse
- `ProjectPulse: Refresh Tasks` - Reload task list
- `ProjectPulse: Create New Task` - Create a new task
- `ProjectPulse: Sync with GitHub Issues` - Sync tasks with GitHub
- `ProjectPulse: Open Task Details` - View/edit task details

## Extension Settings

This extension connects to your ProjectPulse backend and doesn't require additional VS Code settings. Authentication tokens are securely stored using VS Code's SecretStorage API.

## API Integration

The extension integrates with these ProjectPulse API endpoints:

- `POST /api/auth/github` - GitHub OAuth authentication
- `POST /api/auth/verify` - Token verification
- `GET /api/tasks` - Fetch tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/github/repositories` - Get user repositories
- `GET /api/github/issues` - Fetch GitHub issues
- `POST /api/github/sync` - Sync GitHub issues

## Development

### Project Structure
```
src/
├── extension.ts          # Main extension entry point
├── services/
│   ├── authService.ts    # GitHub OAuth & token management
│   ├── taskService.ts    # Task CRUD operations
│   └── githubService.ts  # GitHub API integration
└── providers/
    ├── taskProvider.ts   # Task tree view provider
    └── authProvider.ts   # Authentication tree view provider
```

### Building
```bash
npm run compile        # Compile TypeScript
npm run watch         # Watch mode for development
npm run package       # Build for production
```

### Testing
```bash
npm run test          # Run test suite
```

## Known Issues

- Token refresh is manual - automatic refresh will be added in future versions
- GitHub sync is one-way (GitHub → ProjectPulse) - bidirectional sync coming soon
- Large task lists may impact performance - pagination will be implemented

## Release Notes

### 0.0.1 (Initial Release)

- Complete task management sidebar with categorized views
- GitHub OAuth authentication integration
- Real-time task CRUD operations
- GitHub issues synchronization
- Webview panels for detailed task editing
- Activity bar integration with ProjectPulse branding

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For issues and feature requests, please use the GitHub Issues page or contact the ProjectPulse development team.

---

**Enjoy productive coding with ProjectPulse!** 🚀
