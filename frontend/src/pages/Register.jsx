// Register route is handled by Auth.jsx — this is a redirect shim
import { Navigate } from "react-router-dom";
const Register = () => <Navigate to="/login" replace />;
export default Register;