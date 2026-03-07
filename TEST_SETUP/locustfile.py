from locust import HttpUser, task, between

class ChatUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def index_page(self):
        self.client.get("/")

    @task
    def get_messages(self):
        # Sample endpoint for getting messages
        self.client.get("/chat/api/messages/")

    @task
    def check_license(self):
        # Sample endpoint for checking license
        self.client.get("/chat/api/check-license/")
