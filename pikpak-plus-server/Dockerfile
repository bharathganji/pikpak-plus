# Use an official Python runtime as a parent image
FROM python:3.10-slim-buster

# Set the working directory to /app
WORKDIR /app

COPY ./requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

EXPOSE 5000
# Copy the contents of the entire project into the container at /app
COPY . .


# Run Flask in the background and npm run dev

# CMD ["python", "api.py"]
CMD ["gunicorn","--config", "gunicorn_config.py", "api:app"]
