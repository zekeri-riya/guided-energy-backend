import express from 'express';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import {adminValidation} from '../../validations/admin.validation';
import * as adminController from '../../controllers/admin.controller';

const router = express.Router();

router
  .route('/competitor/analysis/business/:businessId')
  .post(
    auth('manageAnalysis'), // Admin-only permission
    validate(adminValidation.triggerAnalysis),
    adminController.triggerBusinessAnalysis
  );

export default router;