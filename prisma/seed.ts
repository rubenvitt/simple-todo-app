import * as bcrypt from 'bcrypt';
import { PermissionLevel, PrismaClient, TaskPriority, TaskStatus } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Clear existing data in reverse order of dependencies
    await prisma.notification.deleteMany();
    await prisma.task.deleteMany();
    await prisma.listShare.deleteMany();
    await prisma.list.deleteMany();
    await prisma.user.deleteMany();

    console.log('🧹 Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.create({
        data: {
            email: 'john@example.com',
            passwordHash: hashedPassword,
            name: 'John Doe',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'jane@example.com',
            passwordHash: hashedPassword,
            name: 'Jane Smith',
        },
    });

    const user3 = await prisma.user.create({
        data: {
            email: 'bob@example.com',
            passwordHash: hashedPassword,
            name: 'Bob Wilson',
        },
    });

    console.log('👥 Created users');

    // Create lists
    const personalList = await prisma.list.create({
        data: {
            name: 'Personal Tasks',
            description: 'My personal todo list',
            color: '#10B981', // Green
            userId: user1.id,
        },
    });

    const workList = await prisma.list.create({
        data: {
            name: 'Work Projects',
            description: 'Professional tasks and projects',
            color: '#3B82F6', // Blue
            userId: user1.id,
        },
    });

    const sharedList = await prisma.list.create({
        data: {
            name: 'Team Collaboration',
            description: 'Shared team tasks',
            color: '#8B5CF6', // Purple
            userId: user2.id,
        },
    });

    console.log('📋 Created lists');

    // Create tasks
    await prisma.task.createMany({
        data: [
            {
                title: 'Buy groceries',
                description: 'Milk, bread, eggs, and fruits',
                status: TaskStatus.TODO,
                priority: TaskPriority.MEDIUM,
                listId: personalList.id,
                assignedUserId: user1.id,
            },
            {
                title: 'Review code',
                description: 'Review the authentication module PR',
                status: TaskStatus.IN_PROGRESS,
                priority: TaskPriority.HIGH,
                listId: workList.id,
                assignedUserId: user1.id,
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            },
            {
                title: 'Plan weekend trip',
                description: 'Research destinations and book accommodation',
                status: TaskStatus.BACKLOG,
                priority: TaskPriority.LOW,
                listId: personalList.id,
                assignedUserId: user1.id,
            },
            {
                title: 'Update documentation',
                description: 'Update API documentation for new endpoints',
                status: TaskStatus.TODO,
                priority: TaskPriority.MEDIUM,
                listId: workList.id,
                assignedUserId: user1.id,
            },
            {
                title: 'Setup CI/CD pipeline',
                description: 'Configure automated testing and deployment',
                status: TaskStatus.REVIEW,
                priority: TaskPriority.HIGH,
                listId: sharedList.id,
                assignedUserId: user2.id,
            },
            {
                title: 'Design user interface',
                description: 'Create mockups for the new feature',
                status: TaskStatus.DONE,
                priority: TaskPriority.MEDIUM,
                listId: sharedList.id,
                assignedUserId: user3.id,
            },
        ],
    });

    console.log('✅ Created tasks');

    // Create list shares
    await prisma.listShare.createMany({
        data: [
            {
                listId: sharedList.id,
                userId: user1.id,
                permissionLevel: PermissionLevel.EDITOR,
            },
            {
                listId: sharedList.id,
                userId: user3.id,
                permissionLevel: PermissionLevel.EDITOR,
            },
            {
                listId: workList.id,
                userId: user2.id,
                permissionLevel: PermissionLevel.VIEWER,
            },
        ],
    });

    console.log('🤝 Created list shares');

    // Create notifications
    await prisma.notification.createMany({
        data: [
            {
                userId: user1.id,
                message: 'You have been invited to collaborate on "Team Collaboration" list',
                readStatus: false,
            },
            {
                userId: user1.id,
                message: 'Task "Review code" is due in 2 days',
                readStatus: false,
            },
            {
                userId: user2.id,
                message: 'New task "Setup CI/CD pipeline" has been assigned to you',
                readStatus: true,
            },
            {
                userId: user3.id,
                message: 'You have been added as an editor to "Team Collaboration"',
                readStatus: false,
            },
        ],
    });

    console.log('🔔 Created notifications');

    console.log('✨ Database seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    }); 