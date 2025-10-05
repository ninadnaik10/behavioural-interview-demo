import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a-very-secret-key'
    
    MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
    MODEL_PATH = os.path.join(MODEL_DIR, "trained_model.h5")
    SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
    
    SAMPLE_RATE = 16000
    TRANSFORMER_MODEL_NAME = "facebook/wav2vec2-base-960h"
    
    MONGO_URI = os.environ.get("MONGO_URI")
    DATABASE_NAME = "Speaksure2"
    GRIDFS_BUCKET_NAME = "result_bucket"
    
    ASSEMBLYAI_API_KEY = os.environ.get("ASSEMBLYAI_API_KEY")

    @staticmethod
    def init_app(app):
        pass

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}