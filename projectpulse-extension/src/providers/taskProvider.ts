import * as vscode from 'vscode';
import { TaskService, Task } from '../services/taskService';
import { GitHubService } from '../services/githubService';

export class TaskItem extends vscode.TreeItem {
    constructor(
        public readonly task: Task,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(task.title, collapsibleState);
        
        this.tooltip = `${task.title}\n${task.description}`;
        this.description = `${task.status} | ${task.priority}`;
        this.contextValue = 'task';
        
        // Set icon based on status
        switch (task.status) {
            case 'todo':
                this.iconPath = new vscode.ThemeIcon('circle-outline');
                break;
            case 'in-progress':
                this.iconPath = new vscode.ThemeIcon('loading~spin');
                break;
            case 'done':
                this.iconPath = new vscode.ThemeIcon('check');
                break;
        }

        // Add command to open task details
        this.command = {
            command: 'projectpulse.openTask',
            title: 'Open Task',
            arguments: [task]
        };
    }
}

export class TaskCategoryItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly tasks: Task[]
    ) {
        super(label, collapsibleState);
        
        this.tooltip = `${label} (${tasks.length} tasks)`;
        this.description = `${tasks.length}`;
        this.contextValue = 'taskCategory';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class TaskProvider implements vscode.TreeDataProvider<TaskItem | TaskCategoryItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TaskItem | TaskCategoryItem | undefined | null | void> = new vscode.EventEmitter<TaskItem | TaskCategoryItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TaskItem | TaskCategoryItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private tasks: Task[] = [];

    constructor(
        private taskService: TaskService,
        private githubService: GitHubService
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskItem | TaskCategoryItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TaskItem | TaskCategoryItem): Promise<(TaskItem | TaskCategoryItem)[]> {
        if (!element) {
            // Root level - show categories
            try {
                const token = await vscode.workspace.getConfiguration().get('projectpulse.token') as string;
                if (!token) {
                    return [];
                }

                this.tasks = await this.taskService.getTasks(token);
                
                const categories = [
                    new TaskCategoryItem(
                        'My Tasks',
                        vscode.TreeItemCollapsibleState.Expanded,
                        this.tasks.filter(task => !task.githubIssueId)
                    ),
                    new TaskCategoryItem(
                        'GitHub Issues',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        this.tasks.filter(task => task.githubIssueId)
                    ),
                    new TaskCategoryItem(
                        'To Do',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        this.tasks.filter(task => task.status === 'todo')
                    ),
                    new TaskCategoryItem(
                        'In Progress',
                        vscode.TreeItemCollapsibleState.Expanded,
                        this.tasks.filter(task => task.status === 'in-progress')
                    ),
                    new TaskCategoryItem(
                        'Done',
                        vscode.TreeItemCollapsibleState.Collapsed,
                        this.tasks.filter(task => task.status === 'done')
                    )
                ];

                return categories.filter(category => category.tasks.length > 0);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                return [];
            }
        } else if (element instanceof TaskCategoryItem) {
            // Show tasks in category
            return element.tasks.map(task => 
                new TaskItem(task, vscode.TreeItemCollapsibleState.None)
            );
        }

        return [];
    }

    async getTasksByStatus(status: string): Promise<Task[]> {
        return this.tasks.filter(task => task.status === status);
    }

    async getTasksByPriority(priority: string): Promise<Task[]> {
        return this.tasks.filter(task => task.priority === priority);
    }
}
