from typing import List, Tuple

def calculate_linear_regression(x: List[float], y: List[float]) -> Tuple[float, float]:
    """
    Calculates the slope (m) and y-intercept (b) of the best-fit line (y = mx + b).
    """
    n = len(x)
    if n != len(y) or n == 0:
        return 0.0, 0.0
    
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x_sq = sum(xi ** 2 for xi in x)
    
    denominator = (n * sum_x_sq - sum_x ** 2)
    if denominator == 0:
        return 0.0, sum_y / n if n > 0 else 0.0 # Horizontal line average
        
    m = (n * sum_xy - sum_x * sum_y) / denominator
    b = (sum_y - m * sum_x) / n
    return m, b

def predict_next_values(data: List[float], num_predictions: int = 7) -> List[float]:
    """
    Predicts the next n values based on the input data series.
    Uses indices 0, 1, 2... as x values.
    """
    if not data:
        return [0.0] * num_predictions
        
    # If we have very few data points (< 2), just repeat the last one or average
    if len(data) < 2:
        last_val = data[-1] if data else 0
        return [last_val] * num_predictions
    
    x = list(range(len(data)))
    m, b = calculate_linear_regression(x, data)
    
    predictions = []
    current_x = len(data)
    for i in range(num_predictions):
        pred_y = m * (current_x + i) + b
        predictions.append(max(0.0, pred_y)) # Avoid negative predictions
        
    return predictions
