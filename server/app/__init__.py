from flask import Flask
from flask_cors import CORS
from .core.config import config
from .api import api_blueprint
from .api.services import MLService, TranscriptionService, GrammarService, DatabaseService

def create_app(config_name):
    """Application factory function."""
    app = Flask(__name__)
    
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    app.ml_service = MLService(app)
    app.transcription_service = TranscriptionService(app)
    app.grammar_service = GrammarService()
    app.db_service = DatabaseService(app)
    
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    return app