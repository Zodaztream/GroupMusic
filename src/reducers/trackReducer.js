const trackReducer = (state = [], action) => {
  switch (action.type) {
    case "ADD_TRACK":
      return [...state, action.payload];
    default:
      return state;
  }
};

export default trackReducer;
