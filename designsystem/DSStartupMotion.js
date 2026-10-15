/* Filename: designsystem/DSStartupMotion.js */
(() => {
  const React = window.React;
  const { useEffect, useId, useRef } = React;

  const inputPaths = [
    'M 48 64 H 130 C 180 64 182 150 310 150',
    'M 32 150 H 310',
    'M 48 236 H 130 C 180 236 182 150 310 150'
  ];

  const StartupMotion = ({ logoSrc, logoMotion, title, subtitle, language = 'fa', duration = 3000, onComplete }) => {
    const rootRef = useRef(null);
    const completionRef = useRef(onComplete);
    const logoMaskId = `startup-logo-${useId().replace(/:/g, '')}`;
    const isRtl = language === 'fa';
    completionRef.current = onComplete;

    useEffect(() => {
      const root = rootRef.current;
      const animations = [];
      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const runDuration = Number.isFinite(duration) && duration > 0 ? duration : 3000;
      let finished = false;
      let timer;

      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        completionRef.current?.();
      };
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') finish();
      };
      const handleMotionChange = (event) => {
        if (event.matches) finish();
      };

      document.addEventListener('keydown', handleKeyDown);
      motionPreference.addEventListener('change', handleMotionChange);
      timer = window.setTimeout(finish, motionPreference.matches ? 200 : runDuration);

      const animate = (element, keyframes, start, length, easing = 'ease-in-out') => {
        if (!element?.animate) return;
        animations.push(element.animate(keyframes, {
          delay: start * runDuration,
          duration: length * runDuration,
          easing,
          fill: 'both'
        }));
      };

      if (!motionPreference.matches) {
        root.querySelectorAll('[data-input-path]').forEach((path, index) => {
          animate(path, [
            { strokeDashoffset: 1, opacity: 0 },
            { strokeDashoffset: 0, opacity: 0.6, offset: 0.5 },
            { strokeDashoffset: 0, opacity: 0 }
          ], index * 0.02, 0.27);

          const packet = root.querySelector(`[data-packet="${index}"]`);
          const pathLength = path.getTotalLength();
          const frames = Array.from({ length: 25 }, (_, step) => {
            const point = path.getPointAtLength(pathLength * step / 24);
            return {
              transform: `translate(${point.x}px, ${point.y}px)`,
              opacity: step === 0 || step === 24 ? 0 : 1,
              offset: step / 24
            };
          });
          animate(packet, frames, 0.02 + index * 0.025, 0.22, 'linear');
        });

        animate(root.querySelector('[data-logo]'), [
          { opacity: 0, transform: 'scale(0.84)' },
          { opacity: 1, transform: 'scale(1.04)', offset: 0.7 },
          { opacity: 1, transform: 'scale(1)' }
        ], 0.08, 0.22);
        // A moving highlight stays inside the original PNG's alpha silhouette.
        animate(root.querySelector('[data-circulation]'), [
          { strokeDashoffset: 0.19, opacity: 0 },
          { strokeDashoffset: 0.11, opacity: 0.95, offset: 0.08 },
          { strokeDashoffset: -0.73, opacity: 0.95, offset: 0.92 },
          { strokeDashoffset: -0.81, opacity: 0 }
        ], 0.3, 0.25, 'linear');
        // One pulse on sigma follows circulation, before the result leaves the logo.
        animate(root.querySelector('[data-aggregation]'), [
          { opacity: 0 },
          { opacity: 0.95, offset: 0.5 },
          { opacity: 0 }
        ], 0.56, 0.13);
        animate(root.querySelector('[data-output]'), [
          { strokeDashoffset: 1, opacity: 0 },
          { strokeDashoffset: 0, opacity: 0.7 }
        ], 0.7, 0.12);
        animate(root.querySelector('[data-analysis]'), [
          { strokeDashoffset: 1, opacity: 0 },
          { strokeDashoffset: 0, opacity: 1 }
        ], 0.8, 0.14);
        animate(root.querySelector('[data-result]'), [
          { opacity: 0, transform: 'scale(0)' },
          { opacity: 1, transform: 'scale(1)' }
        ], 0.92, 0.04);
        animate(root.querySelector('[data-caption]'), [
          { opacity: 0, transform: 'translateY(6px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], 0.48, 0.2);
      }

      return () => {
        window.clearTimeout(timer);
        animations.forEach(animation => animation.cancel());
        document.removeEventListener('keydown', handleKeyDown);
        motionPreference.removeEventListener('change', handleMotionChange);
      };
    }, [duration]);

    return (
      <div ref={rootRef} dir={isRtl ? 'rtl' : 'ltr'} role="status" aria-label={title}
        className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6">
        <div className="w-full max-w-2xl text-center">
          <svg viewBox="0 0 640 300" className="w-full overflow-visible" aria-hidden="true" focusable="false">
            <g fill="none" strokeWidth="2" className="text-indigo-300 dark:text-indigo-500" stroke="currentColor">
              {inputPaths.map((path, index) => (
                <path key={index} data-input-path="" d={path} pathLength="1"
                  strokeDasharray="1" style={{ opacity: 0 }} />
              ))}
            </g>
            <g className="text-indigo-500 dark:text-indigo-400" fill="currentColor">
              {inputPaths.map((path, index) => (
                <circle key={index} data-packet={index} r="5" style={{ opacity: 0 }} />
              ))}
            </g>
            <svg x="232" y="62" width="176" height="176" viewBox="0 0 1254 1254">
              <defs>
                <mask id={logoMaskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1254" height="1254"
                  style={{ maskType: 'alpha' }}>
                  <image href={logoSrc} width="1254" height="1254" />
                </mask>
              </defs>
              <image data-logo="" href={logoSrc} width="1254" height="1254"
                style={{ transformOrigin: '627px 627px' }}
                onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
              {logoMotion && (
                <g mask={`url(#${logoMaskId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path data-circulation="" d={logoMotion.flowPath} stroke="currentColor"
                    strokeWidth="150" pathLength="1" strokeDasharray="0.19 0.81"
                    className="text-blue-200 dark:text-blue-100" style={{ opacity: 0 }} />
                  <path data-aggregation="" d={logoMotion.aggregationPath} stroke="currentColor"
                    strokeWidth="205" className="text-indigo-300 dark:text-indigo-200" style={{ opacity: 0 }} />
                </g>
              )}
            </svg>
            <path data-output="" d="M 393 150 H 490" fill="none" stroke="currentColor"
              strokeWidth="2" pathLength="1" strokeDasharray="1"
              className="text-indigo-300 dark:text-indigo-500" style={{ opacity: 0 }} />
            <path data-analysis="" d="M 490 186 L 520 152 L 548 164 L 590 112" fill="none"
              stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
              pathLength="1" strokeDasharray="1" className="text-blue-500 dark:text-blue-400" style={{ opacity: 0 }} />
            <circle data-result="" cx="590" cy="112" r="5" fill="currentColor"
              className="text-blue-500 dark:text-blue-400" style={{ opacity: 0, transformOrigin: '590px 112px' }} />
          </svg>
          <div data-caption="" aria-hidden="true">
            <div className="text-lg sm:text-xl font-bold">{title}</div>
            {subtitle && <div className="mt-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
          </div>
        </div>
      </div>
    );
  };

  window.DSStartupMotion = { StartupMotion };
})();
