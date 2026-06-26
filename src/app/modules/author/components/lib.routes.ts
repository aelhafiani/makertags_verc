import { Route } from '@angular/router';
import { AuthorLayoutComponent } from './author/author.component';
import { GuestAuthResolver } from '../../../core/guest.guard';
import { EditorShellComponent } from './shell/editor-shell.component';

export const authorRoutes: Route[] = [
    {
        path: 'v2/:id',
        component: EditorShellComponent
    },
    {
        path: 'legacy/:id',
        component: AuthorLayoutComponent
    },
    {
        path: 'my/:id',   // user copy from profile
        component: EditorShellComponent,
        data: { userCopy: true }
    },
    {
        path: ':id',       // original art from catalog
        component: EditorShellComponent
    }
];
