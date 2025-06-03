import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ListSharesService } from '../../list-shares/list-shares.service';

@Injectable()
export class ListAccessGuard implements CanActivate {
    constructor(private readonly listSharesService: ListSharesService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const listId = request.params.listId || request.params.id;

        if (!user) {
            throw new NotFoundException('User not authenticated');
        }

        if (!listId) {
            throw new NotFoundException('List ID not provided');
        }

        // Check if user has access to the list (either owns it or has shared access)
        const hasAccess = await this.listSharesService.checkListAccess(user.id, listId);

        if (!hasAccess) {
            throw new NotFoundException('List not found or you do not have access to it');
        }

        return true;
    }
} 