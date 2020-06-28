import { combineReducers } from "redux";
import testReducer from "./testReducer";
import trackReducer from "./trackReducer";

const allReducers = combineReducers({
  testReducer,
  tracks: trackReducer
});
export default allReducers;
