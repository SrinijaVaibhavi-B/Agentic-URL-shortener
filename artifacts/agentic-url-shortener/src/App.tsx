import { useEffect, useRef, type ReactNode } from 'react';
import {
  ClerkProvider,
  RedirectToSignIn,
  Show,
  SignIn,
  SignUp,
  useClerk,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Redirect,
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

import { Layout } from '@/components/layout';
import Home from '@/pages/home';
import Runs from '@/pages/runs';
import Urls from '@/pages/urls';
import Analytics from '@/pages/analytics';
import Audit from '@/pages/audit';
import Architecture from '@/pages/architecture';
import Landing from '@/pages/landing';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
  },
  variables: {
    colorPrimary: '#2563eb',
    colorForeground: '#0f172a',
    colorMutedForeground: '#64748b',
    colorDanger: '#dc2626',
    colorBackground: '#ffffff',
    colorInput: '#f8fafc',
    colorInputForeground: '#0f172a',
    colorNeutral: '#cbd5e1',
    fontFamily: 'Inter, sans-serif',
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox:
      'bg-white rounded-xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-slate-950',
    headerSubtitle: 'text-slate-600',
    socialButtonsBlockButtonText: 'text-slate-900',
    formFieldLabel: 'text-slate-900',
    footerActionLink: 'text-blue-700 hover:text-blue-800',
    footerActionText: 'text-slate-600',
    dividerText: 'text-slate-500',
    identityPreviewEditButton: 'text-blue-700',
    formFieldSuccessText: 'text-emerald-700',
    alertText: 'text-red-800',
    logoBox: 'h-12',
    logoImage: 'h-12',
    socialButtonsBlockButton:
      'border-slate-300 bg-white hover:bg-slate-50',
    formButtonPrimary: 'bg-blue-600 hover:bg-blue-700',
    formFieldInput: 'border-slate-300 bg-slate-50 text-slate-950',
    footerAction: 'bg-transparent',
    dividerLine: 'bg-slate-200',
    alert: 'border-red-200 bg-red-50',
    otpCodeFieldInput: 'border-slate-300 text-slate-950',
    formFieldRow: 'text-slate-950',
    main: 'text-slate-950',
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/control-room" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}

function AuthCacheListener({
  onUserChange,
}: {
  onUserChange: (userId: string | null) => void;
}) {
  const { addListener } = useClerk();
  useEffect(
    () => addListener(({ user }) => onUserChange(user?.id ?? null)),
    [addListener, onUserChange],
  );
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const previousUserId = useRef<string | null | undefined>(undefined);
  return (
    <Show when="signed-in">
      <AuthCacheListener
        onUserChange={(userId) => {
          if (
            previousUserId.current !== undefined &&
            previousUserId.current !== userId
          ) {
            queryClient.clear();
          }
          previousUserId.current = userId;
        }}
      />
    </Show>
  );
}

function AppRoutes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/control-room">
          <ProtectedPage>
            <Layout><Home /></Layout>
          </ProtectedPage>
        </Route>
        <Route path="/runs">
          <ProtectedPage>
            <Layout><Runs /></Layout>
          </ProtectedPage>
        </Route>
        <Route path="/urls">
          <ProtectedPage>
            <Layout><Urls /></Layout>
          </ProtectedPage>
        </Route>
        <Route path="/analytics/:slug">
          <ProtectedPage>
            <Layout><Analytics /></Layout>
          </ProtectedPage>
        </Route>
        <Route path="/audit">
          <ProtectedPage>
            <Layout><Audit /></Layout>
          </ProtectedPage>
        </Route>
        <Route path="/architecture">
          <ProtectedPage>
            <Layout><Architecture /></Layout>
          </ProtectedPage>
        </Route>
        <Route>
          <ProtectedPage>
            <Layout><NotFound /></Layout>
          </ProtectedPage>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: 'Operator access',
            subtitle: 'Sign in to open the Agentic Control Room',
          },
        },
        signUp: {
          start: {
            title: 'Create an operator account',
            subtitle: 'Secure your governed engineering workspace',
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <ClerkQueryClientCacheInvalidator />
      <AppRoutes />
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
