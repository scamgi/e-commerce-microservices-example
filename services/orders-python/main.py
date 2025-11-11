import os
import psycopg2
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import List
import logging
import time

# --- Configuration & Logging ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- Database Connection ---
def get_db_connection():
    # Retry connection to handle service startup order
    retries = 10
    while retries > 0:
        try:
            conn = psycopg2.connect(
                host=os.environ.get("DB_HOST"),
                port=os.environ.get("DB_PORT"),
                user=os.environ.get("DB_USER"),
                dbname=os.environ.get("DB_DBNAME"),
            )
            logger.info("Successfully connected to the database!")
            return conn
        except psycopg2.OperationalError as e:
            logger.warning(f"Database connection failed: {e}. Retrying...")
            retries -= 1
            time.sleep(5)
    logger.error("Could not connect to the database after several retries.")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
        detail="Database connection failed"
    )


# --- Pydantic Models for Data Validation ---
class OrderItem(BaseModel):
    product_id: str
    quantity: int = Field(..., gt=0)
    price_per_item: float = Field(..., gt=0)

class OrderCreate(BaseModel):
    user_id: str # Assuming user_id is a UUID string
    total_amount: float = Field(..., gt=0)
    items: List[OrderItem]

# --- API Routes ---
@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(order: OrderCreate):
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Use a transaction to ensure all-or-nothing data integrity
            conn.autocommit = False

            # 1. Insert into the main 'orders' table
            cur.execute(
                """
                INSERT INTO orders (user_id, total_amount)
                VALUES (%s, %s) RETURNING id;
                """,
                (order.user_id, order.total_amount)
            )
            order_id = cur.fetchone()[0]

            # 2. Insert each item into the 'order_items' table
            for item in order.items:
                cur.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, quantity, price_per_item)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (order_id, item.product_id, item.quantity, item.price_per_item)
                )

            # Commit the transaction
            conn.commit()

            return {"message": "Order created successfully", "order_id": order_id}

    except psycopg2.Error as e:
        logger.error(f"Database error: {e}")
        if conn:
            conn.rollback() # Rollback on error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to create order: {e}"
        )
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )
    finally:
        if conn:
            conn.close()