import { NgTemplateOutlet } from "@angular/common";
import {
  Component,
  computed,
  type ElementRef,
  Input,
  signal,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import type { DynamicStepProps, WorkflowState } from "@glowhop/core-tour";
import type { AngularTourContent } from "../glow-tour";
import { glowTour } from "../glow-tour";

const POPOVER_ID = "glow-tour-popover";

export const GLOW_TOUR_COMPONENT_TEMPLATES = {
  root: "<section data-glow-tour-root><ng-content /></section>",
  header:
    '<header data-glow-tour-header id="glow-tour-title">@if (titleTemplate()) { <ng-container [ngTemplateOutlet]="titleTemplate()" /> } @else { {{ titleText() }} }</header>',
  content:
    '<div data-glow-tour-content id="glow-tour-description" aria-live="polite">@if (contentTemplate()) { <ng-container [ngTemplateOutlet]="contentTemplate()" /> } @else { {{ contentText() }} }</div>',
  footer: "@if (!stepProps().hideFooter) { <footer data-glow-tour-footer><ng-content /></footer> }",
  popover:
    '<section #tourElement data-glow-tour-popover id="glow-tour-popover" tabindex="-1" role="dialog" aria-labelledby="glow-tour-title" aria-describedby="glow-tour-description"><ng-content /></section>',
  pointer:
    '<div #tourElement data-glow-tour-pointer aria-hidden="true"><div data-glow-tour-pointer-content><ng-content /></div></div>',
  overlay:
    '<svg #tourElement data-glow-tour-overlay aria-hidden="true" role="presentation" focusable="false" viewBox="0 0 0 0"><path data-glow-tour-overlay-path fill-rule="evenodd" /><ng-content /></svg>',
  backTrigger:
    '@if (!isHidden()) { <button type="button" data-action="back" data-glow-tour-back-trigger [attr.aria-label]="ariaLabel || label()" [attr.aria-controls]="ariaControls" [disabled]="isDisabled()" (click)="back($event)"><ng-content>{{ label() }}</ng-content></button> }',
  nextTrigger:
    '@if (!isHidden()) { <button type="button" data-action="next" data-glow-tour-next-trigger [attr.aria-label]="ariaLabel || label()" [attr.aria-controls]="ariaControls" [disabled]="isDisabled()" (click)="next($event)"><ng-content>{{ label() }}</ng-content></button> }',
} as const;

abstract class GlowTourReactiveComponent {
  readonly snapshot = signal<WorkflowState<AngularTourContent>>(glowTour.state.get());
  readonly stepProps = signal<DynamicStepProps<AngularTourContent>>({ content: "", title: "" });
  private stepCleanup?: () => void;
  private readonly stateCleanup: () => void;

  constructor() {
    this.syncState(glowTour.state.get());
    this.stateCleanup = glowTour.state.subscribe((state) => this.syncState(state));
  }

  private syncState(state: WorkflowState<AngularTourContent>) {
    this.snapshot.set(state);
    this.stepCleanup?.();
    this.stepCleanup = undefined;
    const step = state.currentStep;
    if (!step) {
      this.stepProps.set({ content: "", title: "" });
      return;
    }
    this.stepProps.set(step.currentProps.get());
    this.stepCleanup = step.currentProps.subscribe((value) => this.stepProps.set(value));
  }

  ngOnDestroy() {
    this.stepCleanup?.();
    this.stateCleanup();
  }
}

@Component({
  selector: "glow-tour-root",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.root,
})
export class GlowTourRoot {}

@Component({
  selector: "glow-tour-header",
  standalone: true,
  imports: [NgTemplateOutlet],
  template: GLOW_TOUR_COMPONENT_TEMPLATES.header,
})
export class GlowTourHeader extends GlowTourReactiveComponent {
  readonly titleTemplate = computed(() => {
    const value = this.stepProps().title;
    return value instanceof TemplateRef ? value : null;
  });
  readonly titleText = computed(() => {
    const value = this.stepProps().title;
    return typeof value === "string" ? value : "";
  });
}

@Component({
  selector: "glow-tour-content",
  standalone: true,
  imports: [NgTemplateOutlet],
  template: GLOW_TOUR_COMPONENT_TEMPLATES.content,
})
export class GlowTourContent extends GlowTourReactiveComponent {
  readonly contentTemplate = computed(() => {
    const value = this.stepProps().content;
    return value instanceof TemplateRef ? value : null;
  });
  readonly contentText = computed(() => {
    const value = this.stepProps().content;
    return typeof value === "string" ? value : "";
  });
}

@Component({
  selector: "glow-tour-footer",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.footer,
})
export class GlowTourFooter extends GlowTourReactiveComponent {}

@Component({
  selector: "glow-tour-popover",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.popover,
})
export class GlowTourPopover {
  @ViewChild("tourElement", { static: true }) private readonly element!: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    glowTour.state.registerElementPopover(this.element.nativeElement);
  }

  ngOnDestroy() {
    glowTour.state.registerElementPopover(null);
  }
}

@Component({
  selector: "glow-tour-pointer",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.pointer,
})
export class GlowTourPointer {
  @ViewChild("tourElement", { static: true }) private readonly element!: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    glowTour.state.registerElementPointer(this.element.nativeElement);
  }

  ngOnDestroy() {
    glowTour.state.registerElementPointer(null);
  }
}

@Component({
  selector: "glow-tour-overlay",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.overlay,
})
export class GlowTourOverlay {
  @ViewChild("tourElement", { static: true }) private readonly element!: ElementRef<SVGSVGElement>;

  ngAfterViewInit() {
    glowTour.state.registerElementOverlay(this.element.nativeElement);
  }

  ngOnDestroy() {
    glowTour.state.registerElementOverlay(null);
  }
}

@Component({
  selector: "glow-tour-back-trigger",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.backTrigger,
})
export class GlowTourBackTrigger extends GlowTourReactiveComponent {
  @Input() ariaControls = POPOVER_ID;
  @Input() ariaLabel?: string;
  @Input() backLabel?: string;

  readonly isHidden = computed(
    () => this.snapshot().isFirstStep || this.stepProps().hideBackButton === true,
  );
  readonly isDisabled = computed(
    () => !this.snapshot().canGoBack || this.stepProps().disableBackButton === true,
  );
  readonly label = computed(
    () => this.backLabel ?? this.snapshot().startOptions.popover?.buttons?.backLabel ?? "Back step",
  );

  back(event: Event) {
    event.preventDefault();
    void glowTour.state.back();
  }
}

@Component({
  selector: "glow-tour-next-trigger",
  standalone: true,
  template: GLOW_TOUR_COMPONENT_TEMPLATES.nextTrigger,
})
export class GlowTourNextTrigger extends GlowTourReactiveComponent {
  @Input() ariaControls = POPOVER_ID;
  @Input() ariaLabel?: string;
  @Input() finishLabel?: string;
  @Input() nextLabel?: string;

  readonly isHidden = computed(() => this.stepProps().hideNextButton === true);
  readonly isDisabled = computed(
    () => !this.snapshot().canGoNext || this.stepProps().disableNextButton === true,
  );
  readonly label = computed(() => {
    const labels = this.snapshot().startOptions.popover?.buttons;
    return this.snapshot().isLastStep
      ? (this.finishLabel ?? labels?.finishLabel ?? "Finish tour")
      : (this.nextLabel ?? labels?.nextLabel ?? "Next step");
  });

  next(event: Event) {
    event.preventDefault();
    void glowTour.state.next();
  }
}
