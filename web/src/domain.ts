// web/src/domain.ts
export interface UIElement {
    text: string | null;
    description: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  
  export interface Interaction {
    mouseHover?: { x: number; y: number };
    mouseClick?: { x: number; y: number };
    mouseScroll?: { x: number; y: number };
    keyPress?: { key: string };
    typeText?: { text: string };
    wait?: { ms: number };
    goto?: { label: string };
  }
  
  export interface Action {
    elementIndex: number | null;
    interaction: Interaction;
  }
  
  export interface AIAssessment {
    reasoning: string;
    uiElements: UIElement[];
    actions: Action[];
  }