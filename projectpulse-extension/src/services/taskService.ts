export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'done';
    priority: 'low' | 'medium' | 'high';
    assignee?: string;
    createdAt: string;
    updatedAt: string;
    githubIssueId?: number;
}

export interface CreateTaskData {
    title: string;
    description: string;
    status: string;
    priority: string;
}

export class TaskService {
    private readonly API_BASE_URL = 'http://localhost:4000/api';

    async getTasks(token: string): Promise<Task[]> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/tasks`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tasks: ${response.statusText}`);
            }

            return await response.json() as Task[];
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }

    async createTask(taskData: CreateTaskData, token: string): Promise<Task> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) {
                throw new Error(`Failed to create task: ${response.statusText}`);
            }

            return await response.json() as Task;
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    async updateTask(taskId: string, updates: Partial<Task>, token: string): Promise<Task> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error(`Failed to update task: ${response.statusText}`);
            }

            return await response.json() as Task;
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    }

    async deleteTask(taskId: string, token: string): Promise<void> {
        try {
            const response = await fetch(`${this.API_BASE_URL}/tasks/${taskId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to delete task: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    async getTasksByStatus(status: string, token: string): Promise<Task[]> {
        try {
            const tasks = await this.getTasks(token);
            return tasks.filter(task => task.status === status);
        } catch (error) {
            console.error('Error fetching tasks by status:', error);
            throw error;
        }
    }

    async getTasksByPriority(priority: string, token: string): Promise<Task[]> {
        try {
            const tasks = await this.getTasks(token);
            return tasks.filter(task => task.priority === priority);
        } catch (error) {
            console.error('Error fetching tasks by priority:', error);
            throw error;
        }
    }
}
