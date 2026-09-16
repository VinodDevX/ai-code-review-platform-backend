<!-- INSTALLATION -->

# Clone
git clone https://github.com/VinodDevX/ai-code-review-platform-backend.git

# Enter project
cd ai-code-review-platform-backend/backend

# Start everything
docker compose up --build

# Run migrations
docker compose exec app npx prisma migrate deploy