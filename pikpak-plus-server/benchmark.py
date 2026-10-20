import time
from unittest.mock import MagicMock
from app.tasks.cleanup import delete_supabase_records_for_ids

class MockResponse:
    def __init__(self, data):
        self.data = data

class MockQuery:
    def __init__(self, mock_data, latency=0.05):
        self.mock_data = mock_data
        self.latency = latency
        self._action = None

    def select(self, *args, **kwargs):
        self._action = "select"
        return self

    def eq(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def delete(self, *args, **kwargs):
        self._action = "delete"
        return self

    def in_(self, *args, **kwargs):
        return self

    def execute(self):
        time.sleep(self.latency) # Network latency
        if self._action == "select":
            data = self.mock_data.pop(0) if self.mock_data else []
            return MockResponse(data)
        elif self._action == "delete":
            return MockResponse([{"id": 1}])
        return MockResponse([])

class MockSupabase:
    def __init__(self, mock_data, latency=0.05):
        self.mock_data = mock_data
        self.latency = latency

    def table(self, name):
        return MockQuery(self.mock_data, self.latency)


def run_benchmark():
    # 100 records in one page
    records = []
    for i in range(100):
        records.append({
            "id": f"rec_{i}",
            "data": {
                "task": {
                    "id": f"task_{i}"
                }
            }
        })

    mock_data = [records, []]
    supabase = MockSupabase(mock_data, latency=0.01) # 10ms latency per query

    ids_to_delete = [f"task_{i}" for i in range(100)]

    start_time = time.time()
    delete_supabase_records_for_ids(supabase, ids_to_delete)
    end_time = time.time()

    print(f"Time taken: {end_time - start_time:.3f} seconds")

if __name__ == "__main__":
    run_benchmark()
