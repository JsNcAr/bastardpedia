import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { StateMessage } from '@/ui/StateMessage';

export function NotFound() {
  return (
    <div className="page-state">
      <StateMessage
        icon="info"
        title="Page not found"
        action={<Link to="/">Go to the catalogue</Link>}
      >
        <p>There is nothing at this address.</p>
      </StateMessage>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${String(error.status)} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <div className="page-state">
      <StateMessage
        icon="triangle-alert"
        title="Something went wrong"
        role="alert"
        action={
          <a className="button button-primary" href="/">
            Reload the catalogue
          </a>
        }
      >
        <p>{detail}</p>
      </StateMessage>
    </div>
  );
}
