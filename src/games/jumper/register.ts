import { CameraTracking } from "@/games/jumper/components/cameraTrackingComponent";
import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "@/components/animationComponent";
import { CollidedComponent } from "@/games/jumper/components/collidedComponent";
import { ColliderComponent } from "@/games/jumper/components/colliderComponent";
import { CounterComponent } from "@/games/jumper/components/counterComponent";
import { FacingComponent } from "@/components/facingComponent";
import { FollowCameraComponent } from "@/games/jumper/components/followCameraComponent";
import { FPSComponent } from "@/games/jumper/components/fpsComponent";
import { Gravity } from "@/games/jumper/components/gravityComponent";
import { InputComponent } from "@/games/jumper/components/inputComponent";
import { JumpComponent } from "@/games/jumper/components/jumpComponent";
import { MovementComponent } from "@/games/jumper/components/movementComponent";
import { CoinComponent } from "@/games/jumper/components/coinComponent";
import { RocketBoosterComponent } from "@/games/jumper/components/rocketBoosterComponent";
import { RocketFlightComponent } from "@/games/jumper/components/rocketFlightComponent";
import { PlayerComponent } from "@/games/jumper/components/playerComponent";
import { PlatformComponent } from "@/games/jumper/components/platformComponent";
import { PlatformSpawner } from "@/games/jumper/components/platformSpawnerComponent";
import { TransformComponent } from "@/components/transformComponent";
import { PrimitiveRenderComponent } from "@/components/renderableComponent";
import { RenderLayerComponent } from "@/components/renderLayerComponent";
import { SpriteRenderComponent } from "@/components/spriteRenderComponent";
import { TextRenderComponent } from "@/components/textRenderComponent";
import { VelocityComponent } from "@/components/velocityComponent";
import { Camera } from "@/components/cameraComponent";
import type { JumperWorld } from "@/games/jumper/world";
import { AnimatedSpriteSystem } from "@/systems/animatedSpriteSystem";
import { AudioSystem } from "@/games/jumper/systems/audioSystem";
import { CameraSystem } from "@/games/jumper/systems/cameraSystem";
import { CoinSystem } from "@/games/jumper/systems/coinSystem";
import { RocketBoosterSystem } from "@/games/jumper/systems/rocketBoosterSystem";
import { RocketFlightSystem } from "@/games/jumper/systems/rocketFlightSystem";
import { CounterSystem } from "@/games/jumper/systems/counterSystem";
import { DeathSystem } from "@/games/jumper/systems/deathSystem";
import { FacingSystem } from "@/systems/facingSystem";
import { FPSSystem } from "@/games/jumper/systems/fpsSystem";
import { InputSystem } from "@/games/jumper/systems/inputSystem";
import { JumpSystem } from "@/games/jumper/systems/jumpSystem";
import { MovementSystem } from "@/games/jumper/systems/movementSystem";
import { PhysicsSystem } from "@/games/jumper/systems/physicsSystem";
import { PhysicsWorld } from "@/games/jumper/systems/physicsWorld";
import { PlatformSpawnSystem } from "@/games/jumper/systems/platformSpawnSystem";
import { PlatformSystem } from "@/games/jumper/systems/platformSystem";
import { PlayerAnimationStateSystem } from "@/games/jumper/systems/playerAnimationStateSystem";
import { RenderSystem } from "@/systems/renderSystem";
import { RestartSystem } from "@/games/jumper/systems/restartSystem";
import type { InputStrategy } from "@/games/jumper/input";
import type { CanvasRenderer } from "@/render/renderer";
import type { AudioPlayer } from "@/systems/audioPlayer";
import { GodModComponent } from "@/games/jumper/components/godModComponent";
import { CheatSystem } from "@/games/jumper/systems/cheatSystem";
import { MovingPlatformComponent } from "@/games/jumper/components/movingPlatformComponent";
import { MovingPlatformSystem } from "@/games/jumper/systems/movingPlatformSystem";
import { CarrierSurfaceComponent } from "@/games/jumper/components/carrierSurfaceComponent";

export function registerJumperComponents(world: JumperWorld) {
	world.registerComponent(TransformComponent);
	world.registerComponent(CollidedComponent);
	world.registerComponent(ColliderComponent);
	world.registerComponent(Gravity);
	world.registerComponent(InputComponent);
	world.registerComponent(JumpComponent);
	world.registerComponent(MovementComponent);
	world.registerComponent(PlayerComponent);
	world.registerComponent(CoinComponent);
	world.registerComponent(RocketBoosterComponent);
	world.registerComponent(RocketFlightComponent);
	world.registerComponent(PrimitiveRenderComponent);
	world.registerComponent(VelocityComponent);
	world.registerComponent(SpriteRenderComponent);
	world.registerComponent(RenderLayerComponent);
	world.registerComponent(FacingComponent);
	world.registerComponent(AnimationState);
	world.registerComponent(AnimationTable);
	world.registerComponent(AnimationTimer);
	world.registerComponent(Camera);
	world.registerComponent(CameraTracking);
	world.registerComponent(PlatformSpawner);
	world.registerComponent(PlatformComponent);
	world.registerComponent(MovingPlatformComponent);
	world.registerComponent(CarrierSurfaceComponent);
	world.registerComponent(FollowCameraComponent);
	world.registerComponent(CounterComponent);
	world.registerComponent(TextRenderComponent);
	world.registerComponent(FPSComponent);
	world.registerComponent(GodModComponent);
}

import { Screen } from "@/core/screen";

export type RegisterJumperSystemsDeps = {
	screen: Screen;
	inputStrategy: InputStrategy;
	renderer?: CanvasRenderer;
	audioPlayer?: AudioPlayer;
	includeRender?: boolean;
	includeAudio?: boolean;
	/**
	 * Позволяет подменить источники рандома в PlatformSpawnSystem (для детерминизма).
	 * Если не передано — используется дефолтное поведение PlatformSpawnSystem.
	 */
	platformRandom?: ConstructorParameters<typeof PlatformSpawnSystem>[0];
	platformRandomSize?: ConstructorParameters<typeof PlatformSpawnSystem>[1];
	platformRandomRocket?: ConstructorParameters<typeof PlatformSpawnSystem>[2];
	rocketBoosterRandom?: ConstructorParameters<typeof RocketBoosterSystem>[0];
};

export function registerJumperSystems(
	world: JumperWorld,
	deps: RegisterJumperSystemsDeps,
) {
	const physicsWorld = new PhysicsWorld(world, deps.screen);

	world.registerSystem(new CheatSystem());
	world.registerSystem(new InputSystem(deps.inputStrategy));
	world.registerSystem(new MovementSystem());
	world.registerSystem(new JumpSystem());
	world.registerSystem(new MovingPlatformSystem());
	world.registerSystem(physicsWorld);
	world.registerSystem(new CoinSystem());
	world.registerSystem(new RocketBoosterSystem(deps.rocketBoosterRandom));
	world.registerSystem(new PhysicsSystem(physicsWorld));
	world.registerSystem(new RocketFlightSystem());
	world.registerSystem(new FacingSystem());
	world.registerSystem(new CameraSystem(deps.screen));
	world.registerSystem(new DeathSystem(deps.screen));
	world.registerSystem(new RestartSystem(deps.screen));
	world.registerSystem(
		new PlatformSpawnSystem(
			deps.platformRandom,
			deps.platformRandomSize,
			deps.platformRandomRocket,
		),
	);

	world.registerSystem(new PlatformSystem());
	world.registerSystem(new AnimatedSpriteSystem());
	world.registerSystem(new PlayerAnimationStateSystem());

	if (deps.includeAudio && deps.audioPlayer) {
		world.registerSystem(new AudioSystem(deps.audioPlayer));
	}

	world.registerSystem(new CounterSystem());
	world.registerSystem(new FPSSystem());

	if (deps.includeRender && deps.renderer) {
		world.registerSystem(new RenderSystem(deps.renderer, deps.screen));
	}

	return { physicsWorld };
}
