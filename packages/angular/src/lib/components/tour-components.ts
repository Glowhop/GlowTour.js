import { NgTemplateOutlet } from "@angular/common";
import {
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  effect,
  Injectable,
  InjectionToken,
  Injector,
  Input,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import type { GlowTour as CoreGlowTour, TourState } from "@glowhop/core-tour";
import { angularAdapter, getAdapterBridge, type RootBinding } from "../adapter-bridge";
import type { AngularTourContent } from "../glow-tour";

type Tour = CoreGlowTour<AngularTourContent>;

interface ActiveRootBinding {
  readonly binding: RootBinding;
  readonly idPrefix: string | undefined;
  readonly root: HTMLElement;
  readonly tour: Tour;
}

@Injectable()
class GlowTourScope {
  readonly binding = signal<RootBinding | null>(null);
  readonly tour = signal<Tour | null>(null);
}

const GLOW_TOUR_SCOPE = new InjectionToken<GlowTourScope>("GlowTourScope");

function useTourScope() {
  const scope = inject(GLOW_TOUR_SCOPE, { optional: true });
  if (!scope) {
    throw new Error('GlowTour components must be rendered inside <glow-tour-root [tour]="...">.');
  }
  return scope;
}

@Directive()
abstract class GlowTourReactiveComponent {
  protected readonly scope = useTourScope();
  protected readonly snapshot = signal<TourState<AngularTourContent> | null>(null);
  protected readonly step = computed(() => this.snapshot()?.currentStep?.currentProps ?? null);

  constructor() {
    effect(
      (onCleanup) => {
        const tour = this.scope.tour();
        if (!tour) {
          this.snapshot.set(null);
          return;
        }
        this.snapshot.set(tour.state.get());
        onCleanup(tour.state.subscribe((state) => this.snapshot.set(state)));
      },
      { allowSignalWrites: true },
    );
  }
}

@Component({
  selector: "glow-tour-root",
  standalone: true,
  host: { "data-glow-tour-root": "" },
  providers: [GlowTourScope, { provide: GLOW_TOUR_SCOPE, useExisting: GlowTourScope }],
  template: "<ng-content />",
})
export class GlowTourRoot implements OnChanges, OnDestroy, OnInit {
  @Input({ required: true }) tour!: Tour;
  @Input() idPrefix?: string;

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly scope = inject(GlowTourScope);
  private active: ActiveRootBinding | null = null;
  private initialized = false;

  ngOnChanges() {
    if (this.initialized) this.reconcile();
  }

  ngOnInit() {
    if (!this.tour) {
      throw new Error("GlowTourRoot requires a tour input.");
    }

    this.initialized = true;
    this.reconcile();
  }

  ngOnDestroy() {
    this.release();
  }

  private reconcile() {
    const root = this.element.nativeElement;
    const tour = this.tour;
    const idPrefix = this.idPrefix;
    this.scope.tour.set(tour);
    const current = this.active;
    if (
      current !== null &&
      current.root === root &&
      current.tour === tour &&
      current.idPrefix === idPrefix
    ) {
      return;
    }
    this.release();
    const binding = getAdapterBridge(tour).connectRoot({
      adapter: angularAdapter,
      idPrefix,
      root,
    });
    const active = { binding, idPrefix, root, tour };
    this.active = active;
    this.scope.binding.set(binding);
  }

  private release() {
    const active = this.active;
    if (!active) return;
    this.active = null;
    active.binding.release();
    if (this.scope.binding() === active.binding) this.scope.binding.set(null);
  }
}

@Component({
  selector: "glow-tour-header",
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <header data-glow-tour-header [id]="scope.binding()?.ids?.title">
      @if (titleTemplate()) {
        <ng-container [ngTemplateOutlet]="titleTemplate()" />
      } @else {
        {{ titleText() }}
      }
    </header>
  `,
})
export class GlowTourHeader extends GlowTourReactiveComponent {
  readonly titleTemplate = computed(() => {
    const title = this.step()?.title;
    return title instanceof TemplateRef ? title : null;
  });
  readonly titleText = computed(() => {
    const title = this.step()?.title;
    return typeof title === "string" ? title : "";
  });
}

@Component({
  selector: "glow-tour-content",
  standalone: true,
  imports: [NgTemplateOutlet],
  template: `
    <div aria-live="polite" data-glow-tour-content [id]="scope.binding()?.ids?.description">
      @if (contentTemplate()) {
        <ng-container [ngTemplateOutlet]="contentTemplate()" />
      } @else {
        {{ contentText() }}
      }
    </div>
  `,
})
export class GlowTourContent extends GlowTourReactiveComponent {
  readonly contentTemplate = computed(() => {
    const content = this.step()?.content;
    return content instanceof TemplateRef ? content : null;
  });
  readonly contentText = computed(() => {
    const content = this.step()?.content;
    return typeof content === "string" ? content : "";
  });
}

@Component({
  selector: "glow-tour-footer",
  standalone: true,
  template: `@if (!step()?.hideFooter) { <footer data-glow-tour-footer><ng-content /></footer> }`,
})
export class GlowTourFooter extends GlowTourReactiveComponent {}

@Directive()
abstract class GlowTourBoundElement<T extends Element> {
  protected readonly scope = useTourScope();
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  protected bind(element: T, bindElement: (binding: RootBinding, element: T) => () => void) {
    const cleanup = effect(
      (onCleanup) => {
        const binding = this.scope.binding();
        if (binding) onCleanup(bindElement(binding, element));
      },
      { injector: this.injector },
    );
    this.destroyRef.onDestroy(() => cleanup.destroy());
  }
}

@Component({
  selector: "glow-tour-popover",
  standalone: true,
  template: `
    <section #tourElement
      data-glow-tour-popover
      [attr.aria-describedby]="scope.binding()?.ids?.description"
      [attr.aria-labelledby]="scope.binding()?.ids?.title"
      [id]="scope.binding()?.ids?.popover"
      role="dialog"
      tabindex="-1"
    ><ng-content /></section>
  `,
})
export class GlowTourPopover extends GlowTourBoundElement<HTMLElement> implements OnInit {
  @ViewChild("tourElement", { static: true }) private readonly element!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.bind(this.element.nativeElement, (binding, element) => binding.bindPopover(element));
  }
}

@Component({
  selector: "glow-tour-pointer",
  standalone: true,
  template: `
    <div #tourElement data-glow-tour-pointer aria-hidden="true"><div data-glow-tour-pointer-content><ng-content /></div></div>
  `,
})
export class GlowTourPointer extends GlowTourBoundElement<HTMLElement> implements OnInit {
  @ViewChild("tourElement", { static: true }) private readonly element!: ElementRef<HTMLElement>;

  ngOnInit() {
    this.bind(this.element.nativeElement, (binding, element) => binding.bindPointer(element));
  }
}

@Component({
  selector: "glow-tour-overlay",
  standalone: true,
  template: `
    <svg #tourElement data-glow-tour-overlay aria-hidden="true" focusable="false" role="presentation" viewBox="0 0 0 0">
      <path data-glow-tour-overlay-path fill-rule="evenodd" /><ng-content />
    </svg>
  `,
})
export class GlowTourOverlay extends GlowTourBoundElement<SVGSVGElement> implements OnInit {
  @ViewChild("tourElement", { static: true }) private readonly element!: ElementRef<SVGSVGElement>;

  ngOnInit() {
    this.bind(this.element.nativeElement, (binding, element) => binding.bindOverlay(element));
  }
}

@Directive()
abstract class GlowTourTrigger extends GlowTourReactiveComponent {
  private readonly ariaLabelValue = signal<string | undefined>(undefined);
  private readonly disabledValue = signal(false);

  protected readonly ariaLabelText = computed(() => this.ariaLabelValue());
  protected readonly consumerDisabled = computed(() => this.disabledValue());
  protected readonly ariaControls = computed(() => this.scope.binding()?.ids.popover);

  protected setAriaLabel(value: string | undefined) {
    this.ariaLabelValue.set(value);
  }

  protected setDisabled(value: boolean) {
    this.disabledValue.set(value);
  }
}

@Component({
  selector: "glow-tour-back-trigger",
  standalone: true,
  template: `
    @if (!step()?.hideBackButton) {
      <button
        data-glow-tour-back-trigger
        [attr.aria-controls]="ariaControls()"
        [attr.aria-disabled]="isDisabled() ? 'true' : 'false'"
        [attr.aria-label]="ariaLabelText() ?? label()"
        [attr.data-glow-tour-consumer-disabled]="consumerDisabled() ? 'true' : null"
        [disabled]="isDisabled()"
        type="button"
      ><ng-content>{{ label() }}</ng-content></button>
    }
  `,
})
export class GlowTourBackTrigger extends GlowTourTrigger {
  private readonly backLabelValue = signal<string | undefined>(undefined);

  @Input() set ariaLabel(value: string | undefined) {
    this.setAriaLabel(value);
  }
  @Input() set backLabel(value: string | undefined) {
    this.backLabelValue.set(value);
  }
  @Input({ transform: booleanAttribute }) set disabled(value: boolean) {
    this.setDisabled(value);
  }

  readonly isDisabled = computed(
    () =>
      this.consumerDisabled() ||
      !this.snapshot()?.canPrevious ||
      this.step()?.disableBackButton === true,
  );
  readonly label = computed(() => this.backLabelValue() ?? "Back step");
}

@Component({
  selector: "glow-tour-next-trigger",
  standalone: true,
  template: `
    @if (!step()?.hideNextButton) {
      <button
        data-glow-tour-next-trigger
        [attr.aria-controls]="ariaControls()"
        [attr.aria-disabled]="isDisabled() ? 'true' : 'false'"
        [attr.aria-label]="ariaLabelText() ?? label()"
        [attr.data-glow-tour-consumer-disabled]="consumerDisabled() ? 'true' : null"
        [disabled]="isDisabled()"
        type="button"
      ><ng-content>{{ label() }}</ng-content></button>
    }
  `,
})
export class GlowTourNextTrigger extends GlowTourTrigger {
  private readonly finishLabelValue = signal<string | undefined>(undefined);
  private readonly nextLabelValue = signal<string | undefined>(undefined);

  @Input() set ariaLabel(value: string | undefined) {
    this.setAriaLabel(value);
  }
  @Input({ transform: booleanAttribute }) set disabled(value: boolean) {
    this.setDisabled(value);
  }
  @Input() set finishLabel(value: string | undefined) {
    this.finishLabelValue.set(value);
  }
  @Input() set nextLabel(value: string | undefined) {
    this.nextLabelValue.set(value);
  }

  readonly isDisabled = computed(
    () =>
      this.consumerDisabled() ||
      !this.snapshot()?.canAdvance ||
      this.step()?.disableNextButton === true,
  );
  readonly label = computed(() => {
    return this.snapshot()?.isLastStep
      ? (this.finishLabelValue() ?? "Finish tour")
      : (this.nextLabelValue() ?? "Next step");
  });
}

@Component({
  selector: "glow-tour-cancel-trigger",
  standalone: true,
  template: `
    @if (snapshot()?.canCancel) {
      <button
        data-glow-tour-cancel-trigger
        [attr.aria-controls]="ariaControls()"
        [attr.aria-disabled]="isDisabled() ? 'true' : 'false'"
        [attr.aria-label]="ariaLabelText() ?? label()"
        [attr.data-glow-tour-consumer-disabled]="consumerDisabled() ? 'true' : null"
        [disabled]="isDisabled()"
        type="button"
      ><ng-content>{{ label() }}</ng-content></button>
    }
  `,
})
export class GlowTourCancelTrigger extends GlowTourTrigger {
  @Input() set ariaLabel(value: string | undefined) {
    this.setAriaLabel(value);
  }
  @Input({ transform: booleanAttribute }) set disabled(value: boolean) {
    this.setDisabled(value);
  }

  readonly isDisabled = computed(() => this.consumerDisabled() || !this.snapshot()?.canCancel);
  readonly label = computed(() => "Cancel tour");
}
