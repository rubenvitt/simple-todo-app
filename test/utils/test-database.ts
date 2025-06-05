import { execSync } from 'child_process';
import { PrismaClient } from '../../generated/prisma';

export class TestDatabase {
    private static instance: TestDatabase;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: 'postgresql://todo_user:todo_password@localhost:9001/todo_test'
                }
            }
        });
    }

    static getInstance(): TestDatabase {
        if (!TestDatabase.instance) {
            TestDatabase.instance = new TestDatabase();
        }
        return TestDatabase.instance;
    }

    async reset(): Promise<void> {
        // Clean all tables
        await this.prisma.notification.deleteMany();
        await this.prisma.task.deleteMany();
        await this.prisma.listShare.deleteMany();
        await this.prisma.invitation.deleteMany();
        await this.prisma.list.deleteMany();
        await this.prisma.user.deleteMany();
    }

    async seed(): Promise<{
        user1: any;
        user2: any;
        list1: any;
        list2: any;
        task1: any;
        task2: any;
    }> {
        // Create test users
        const user1 = await this.prisma.user.create({
            data: {
                id: 'test-user-1',
                email: 'user1@example.com',
                name: 'Test User 1',
                passwordHash: 'hashed_password123'
            }
        });

        const user2 = await this.prisma.user.create({
            data: {
                id: 'test-user-2',
                email: 'user2@example.com',
                name: 'Test User 2',
                passwordHash: 'hashed_password456'
            }
        });

        // Create test lists
        const list1 = await this.prisma.list.create({
            data: {
                id: 'test-list-1',
                name: 'Test List 1',
                description: 'Test list description',
                userId: user1.id
            }
        });

        const list2 = await this.prisma.list.create({
            data: {
                id: 'test-list-2',
                name: 'Test List 2',
                description: 'Another test list',
                userId: user2.id
            }
        });

        // Create test tasks
        const task1 = await this.prisma.task.create({
            data: {
                id: 'test-task-1',
                title: 'Test Task 1',
                description: 'Test task description',
                listId: list1.id,
                priority: 'MEDIUM',
                status: 'BACKLOG'
            }
        });

        const task2 = await this.prisma.task.create({
            data: {
                id: 'test-task-2',
                title: 'Test Task 2',
                description: 'Another test task',
                listId: list2.id,
                priority: 'HIGH',
                status: 'IN_PROGRESS'
            }
        });

        return { user1, user2, list1, list2, task1, task2 };
    }

    getPrisma(): PrismaClient {
        return this.prisma;
    }

    async close(): Promise<void> {
        await this.prisma.$disconnect();
    }

    static async resetDatabase(): Promise<void> {
        try {
            execSync('npx prisma migrate deploy', {
                env: { ...process.env, DATABASE_URL: 'postgresql://todo_user:todo_password@localhost:9001/todo_test' },
                stdio: 'ignore'
            });
        } catch (error) {
            console.warn('Warning: Could not reset test database:', error);
        }
    }
} 