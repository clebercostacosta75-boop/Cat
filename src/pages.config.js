import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Schedule from './pages/Schedule';
import Courses from './pages/Courses';
import Reports from './pages/Reports';
import Instructors from './pages/Instructors';
import InstructorDetails from './pages/InstructorDetails';
import ClassDetails from './pages/ClassDetails';
import CourseCategories from './pages/CourseCategories';
import GenerateBMM from './pages/GenerateBMM';
import BMMTemplates from './pages/BMMTemplates';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Import": Import,
    "Schedule": Schedule,
    "Courses": Courses,
    "Reports": Reports,
    "Instructors": Instructors,
    "InstructorDetails": InstructorDetails,
    "ClassDetails": ClassDetails,
    "CourseCategories": CourseCategories,
    "GenerateBMM": GenerateBMM,
    "BMMTemplates": BMMTemplates,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};