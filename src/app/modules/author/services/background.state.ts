import { Action, Selector, State, StateContext } from '@ngxs/store';
import { Injectable } from '@angular/core';

export type BackgroundType = 'color' | 'texture' | 'gradient';
export type BackgroundPattern = 'solid' | 'tile' | 'scale';

export interface Swatch {
  id: string;
  name: string;
  colors: string[];
}

export interface BackgroundModel {
  type: BackgroundType;
  value: string;
  opacity: number;
  pattern: BackgroundPattern;
  customColors: string[];
  swatches: Swatch[];
}

const DEFAULT_SWATCHES: Swatch[] = [
  { id: 'default1', name: 'Warm', colors: ['#F3EFE6', '#D4A574', '#1F1F1F'] },
  { id: 'default2', name: 'Cool', colors: ['#E8F4F8', '#5B8BBE', '#1F1F1F'] },
];

const initialState: BackgroundModel = {
  type: 'color',
  value: '#FFFFFF',
  opacity: 1,
  pattern: 'solid',
  customColors: [],
  swatches: DEFAULT_SWATCHES,
};

export class SetBackgroundColor {
  static readonly type = '[Background] Set Color';

  constructor(
    public readonly color: string,
    public readonly rememberCustomColor: boolean = true
  ) {}
}

export class SetBackgroundTexture {
  static readonly type = '[Background] Set Texture';

  constructor(public readonly imageUrl: string) {}
}

export class SetBackgroundOpacity {
  static readonly type = '[Background] Set Opacity';

  constructor(public readonly opacity: number) {}
}

export class AddBackgroundSwatch {
  static readonly type = '[Background] Add Swatch';

  constructor(public readonly swatch: Swatch) {}
}

@State<BackgroundModel>({
  name: 'BackgroundState',
  defaults: initialState,
})
@Injectable()
export class BackgroundState {
  @Selector()
  static currentBackground(state: BackgroundModel): BackgroundModel {
    return state;
  }

  @Selector()
  static customColors(state: BackgroundModel): string[] {
    return state.customColors;
  }

  @Selector()
  static swatches(state: BackgroundModel): Swatch[] {
    return state.swatches;
  }

  @Action(SetBackgroundColor)
  setColor(ctx: StateContext<BackgroundModel>, action: SetBackgroundColor): void {
    const state = ctx.getState();
    const normalized = normalizeHexColor(action.color);
    const nextCustomColors = action.rememberCustomColor
      ? [normalized, ...state.customColors.filter((item) => item !== normalized)].slice(0, 12)
      : state.customColors;

    ctx.patchState({
      type: 'color',
      value: normalized,
      customColors: nextCustomColors,
      pattern: 'solid',
    });
  }

  @Action(SetBackgroundTexture)
  setTexture(ctx: StateContext<BackgroundModel>, action: SetBackgroundTexture): void {
    ctx.patchState({
      type: 'texture',
      value: action.imageUrl,
    });
  }

  @Action(SetBackgroundOpacity)
  setOpacity(ctx: StateContext<BackgroundModel>, action: SetBackgroundOpacity): void {
    const safeOpacity = Math.max(0, Math.min(1, action.opacity));
    ctx.patchState({ opacity: safeOpacity });
  }

  @Action(AddBackgroundSwatch)
  addSwatch(ctx: StateContext<BackgroundModel>, action: AddBackgroundSwatch): void {
    const state = ctx.getState();
    ctx.patchState({ swatches: [action.swatch, ...state.swatches] });
  }
}

function normalizeHexColor(value: string): string {
  const input = (value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(input)) {
    return input.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(input)) {
    return `#${input.toUpperCase()}`;
  }
  return '#FFFFFF';
}
