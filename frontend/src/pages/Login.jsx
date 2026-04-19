// Login route is handled by Auth.jsx — this is a redirect shim
import { Navigate } from "react-router-dom";
const Login = () => <Navigate to="/login" replace />;
export default Login;