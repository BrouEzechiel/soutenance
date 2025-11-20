import { Navigate } from "react-router-dom";

interface ProtectedProps {
    allowedRoles: string[];
    children: JSX.Element;
}

export const ProtectedRoute = ({ allowedRoles, children }: ProtectedProps) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const roles = user.roles || [];

    const isAuthorized = roles.some((role: string) => allowedRoles.includes(role));

    if (!isAuthorized) {
        return <Navigate to="/index" replace />;
    }

    return children;
};