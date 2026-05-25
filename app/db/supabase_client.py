import os

from dotenv import load_dotenv
from supabase import create_client


load_dotenv()


class SupabaseClient:

    _client = None

    @classmethod
    def get_client(cls):

        if cls._client is None:

            cls._client = create_client(
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_KEY")
            )

        return cls._client