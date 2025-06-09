import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class DefaultListService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefaultListForUser(userId: string): Promise<void> {
    // Check if user already has any lists
    const existingListsCount = await this.prisma.list.count({
      where: { userId: userId },
    });

    // Skip if user already has lists
    if (existingListsCount > 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Create default list
      const defaultList = await tx.list.create({
        data: {
          name: '🚀 Meine erste Liste',
          description:
            'Willkommen bei Simple Todo App! Hier sind einige Beispielaufgaben zum Ausprobieren.',
          color: '#3B82F6',
          userId: userId,
        },
      });

      // Create welcome tasks
      const welcomeTasks = [
        {
          title: '👋 Willkommen bei Simple Todo App!',
          description:
            'Erkunde die verschiedenen Features und drag & drop Funktionalität.',
          status: 'TODO' as const,
          priority: 'HIGH' as const,
          listId: defaultList.id,
          assignedUserId: userId,
        },
        {
          title: '✅ Erste Aufgabe abhaken',
          description: 'Verschiebe diese Aufgabe in die "Erledigt" Spalte.',
          status: 'TODO' as const,
          priority: 'MEDIUM' as const,
          listId: defaultList.id,
          assignedUserId: userId,
        },
        {
          title: '🎯 Neue Aufgabe erstellen',
          description:
            'Klicke auf "Neue Aufgabe" um deine eigene Aufgabe hinzuzufügen.',
          status: 'TODO' as const,
          priority: 'LOW' as const,
          listId: defaultList.id,
          assignedUserId: userId,
        },
        {
          title: '🔥 Beispielaufgabe in Arbeit',
          description: 'Diese Aufgabe ist bereits in Bearbeitung.',
          status: 'IN_PROGRESS' as const,
          priority: 'MEDIUM' as const,
          listId: defaultList.id,
          assignedUserId: userId,
        },
        {
          title: '🎉 Beispielaufgabe erledigt',
          description: 'Gratulation! Du hast eine Aufgabe abgeschlossen.',
          status: 'DONE' as const,
          priority: 'LOW' as const,
          listId: defaultList.id,
          assignedUserId: userId,
        },
      ];

      // Create all welcome tasks
      await tx.task.createMany({
        data: welcomeTasks,
      });
    });
  }

  async createDefaultListsForAllUsers(): Promise<{
    processed: number;
    created: number;
  }> {
    // Get all users without any lists
    const usersWithoutLists = await this.prisma.user.findMany({
      where: {
        ownedLists: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    let created = 0;

    for (const user of usersWithoutLists) {
      try {
        await this.createDefaultListForUser(user.id);
        created++;
        console.log(`✅ Created default list for user: ${user.email}`);
      } catch (error) {
        console.error(
          `❌ Failed to create default list for user ${user.email}:`,
          error,
        );
      }
    }

    return {
      processed: usersWithoutLists.length,
      created,
    };
  }
}
