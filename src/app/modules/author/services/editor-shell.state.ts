import { Action, Selector, State, StateContext } from '@ngxs/store';
import { Injectable } from '@angular/core';

export type ToolId =
  | 'edit'
  | 'add-text'
  | 'add-image'
  | 'background'
  | 'elements'
  | 'icons'
  | 'layers'
  | 'qrcode';

export type CanvasObjectType = 'text' | 'image' | 'shape' | 'svg' | 'group';

export interface EditorShellSelectionState {
  objectId: string | null;
  objectType: CanvasObjectType | null;
  isMultiSelection: boolean;
}

export interface EditorShellStateModel {
  activeTool: ToolId | null;
  selection: EditorShellSelectionState;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  historyButtons: {
    canUndo: boolean;
    canRedo: boolean;
  };
  uploadGallery: {
    loading: boolean;
    error: string | null;
  };
  iconSearch: {
    query: string;
    loading: boolean;
    error: string | null;
  };
}

const initialState: EditorShellStateModel = {
  activeTool: null,
  selection: {
    objectId: null,
    objectType: null,
    isMultiSelection: false,
  },
  saveStatus: 'idle',
  historyButtons: {
    canUndo: false,
    canRedo: false,
  },
  uploadGallery: {
    loading: false,
    error: null,
  },
  iconSearch: {
    query: '',
    loading: false,
    error: null,
  },
};

export class SetActiveTool {
  static readonly type = '[EditorShell] SetActiveTool';

  constructor(public readonly tool: ToolId | null) {}
}

export class SetSelection {
  static readonly type = '[EditorShell] SetSelection';

  constructor(public readonly selection: EditorShellSelectionState) {}
}

export class SetSaveStatus {
  static readonly type = '[EditorShell] SetSaveStatus';

  constructor(public readonly saveStatus: EditorShellStateModel['saveStatus']) {}
}

export class SetHistoryButtons {
  static readonly type = '[EditorShell] SetHistoryButtons';

  constructor(public readonly canUndo: boolean, public readonly canRedo: boolean) {}
}

export class SetUploadGallery {
  static readonly type = '[EditorShell] SetUploadGallery';

  constructor(public readonly loading: boolean, public readonly error: string | null = null) {}
}

export class SetIconSearch {
  static readonly type = '[EditorShell] SetIconSearch';

  constructor(
    public readonly query: string,
    public readonly loading: boolean,
    public readonly error: string | null = null
  ) {}
}

@State<EditorShellStateModel>({
  name: 'EditorShellState',
  defaults: initialState,
})
@Injectable()
export class EditorShellState {
  @Selector()
  static getActiveTool(state: EditorShellStateModel): ToolId | null {
    return state.activeTool;
  }

  @Selector()
  static getSelection(state: EditorShellStateModel): EditorShellSelectionState {
    return state.selection;
  }

  @Action(SetActiveTool)
  setActiveTool(ctx: StateContext<EditorShellStateModel>, action: SetActiveTool): void {
    const state = ctx.getState();
    const nextTool = state.activeTool === action.tool ? null : action.tool;
    ctx.patchState({ activeTool: nextTool });
  }

  @Action(SetSelection)
  setSelection(ctx: StateContext<EditorShellStateModel>, action: SetSelection): void {
    ctx.patchState({ selection: action.selection });
  }

  @Action(SetSaveStatus)
  setSaveStatus(ctx: StateContext<EditorShellStateModel>, action: SetSaveStatus): void {
    ctx.patchState({ saveStatus: action.saveStatus });
  }

  @Action(SetHistoryButtons)
  setHistoryButtons(ctx: StateContext<EditorShellStateModel>, action: SetHistoryButtons): void {
    ctx.patchState({
      historyButtons: {
        canUndo: action.canUndo,
        canRedo: action.canRedo,
      },
    });
  }

  @Action(SetUploadGallery)
  setUploadGallery(ctx: StateContext<EditorShellStateModel>, action: SetUploadGallery): void {
    ctx.patchState({
      uploadGallery: {
        loading: action.loading,
        error: action.error,
      },
    });
  }

  @Action(SetIconSearch)
  setIconSearch(ctx: StateContext<EditorShellStateModel>, action: SetIconSearch): void {
    ctx.patchState({
      iconSearch: {
        query: action.query,
        loading: action.loading,
        error: action.error,
      },
    });
  }
}

